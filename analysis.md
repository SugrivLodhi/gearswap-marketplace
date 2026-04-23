# GearSwap — Microservices & Kafka Architecture Analysis

> **Scope**: `backend/` (Node.js · GraphQL · Apollo · BullMQ · Socket.io) + `admin-backend/` (Python · FastAPI)  
> **Date**: April 2026  
> **Author**: Antigravity AI Analysis

---

## 1. Current Architecture Snapshot

```
┌────────────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                              │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  frontend   │  │    mongo     │  │       typesense            │ │
│  │  (Next.js)  │  │  :27017      │  │       :8108               │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬──────────────┘ │
│         │                │                        │                │
│  ┌──────▼──────────────────────────────────────────────────────┐  │
│  │              gearswap-api  (Node.js · :4000)                │  │
│  │                                                             │  │
│  │  GraphQL  ·  Auth  ·  Product  ·  Cart  ·  Order           │  │
│  │  Payment  ·  Discount  ·  Chat(Socket.io)  ·  Recommend    │  │
│  └──────────────────────────────┬──────────────────────────────┘  │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐  │
│  │              gearswap-worker  (BullMQ · Redis)              │  │
│  │                                                             │  │
│  │  email.worker  ·  recommendation.worker                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │          gearswap-admin-api  (FastAPI · :8000)              │  │
│  │                                                             │  │
│  │  /users  ·  /sellers  ·  /products  ·  /stats              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────┐                                                  │
│  │    Redis     │  (BullMQ queues + Socket.io pub/sub)            │
│  │   :6379      │                                                  │
│  └──────────────┘                                                  │
└────────────────────────────────────────────────────────────────────┘
```

### What already exists (the good parts)

| Feature | Current implementation | Maturity |
|---|---|---|
| Background jobs | BullMQ on Redis (email, recommendation) | ✅ Good |
| Real-time chat | Socket.io with Redis pub/sub adapter | ✅ Good |
| Search | Typesense (full-text, typo-tolerant) | ✅ Good |
| Admin separation | Dedicated FastAPI service | ✅ Good |
| Worker isolation | Separate `worker` container in compose | ✅ Good |
| Rate limiting | Per-IP global + auth + per-user | ✅ Good |

---

## 2. Pain Points in the Current Monolith

### 2.1 Backend (Node.js `gearswap-api`)

| # | Pain Point | Where it lives | Risk |
|---|---|---|---|
| P1 | **Checkout is a god transaction** — validates stock, computes GST, creates order, deducts stock, increments discount usage, clears cart, AND sends email, all in one synchronous call. If any step fails, the order is in an inconsistent state. | `order.service.ts:13-181` | 🔴 High |
| P2 | **Stock deduction is not atomic** — a loop of sequential `updateVariantStock()` calls means concurrent checkouts can oversell. | `order.service.ts:150-157` | 🔴 High |
| P3 | **Payment is a mock stub** — `MockRazorpayService` lives in the same process; when you add real Razorpay webhooks the API must remain up to receive callbacks. | `payment.service.ts` | 🟡 Medium |
| P4 | **Order status changes are silent** — `updateOrderStatus` saves to MongoDB but never notifies the buyer (no event, no email, no push). | `order.service.ts:216-253` | 🟡 Medium |
| P5 | **Recommendation graph is synchronous** via BullMQ but tightly coupled — recommendation data lives in Redis inside the same service; if you want an ML model later, you'd have to refactor. | `recommendation.service.ts` / `recommendation.queue.ts` | 🟡 Medium |
| P6 | **Chat persistence + delivery in same process** — `chatService.saveMessage()` is called inside the Socket.io handler. A spike in messages stresses MongoDB writes on the API server. | `chat.socket.ts:94-118` | 🟡 Medium |
| P7 | **All modules share one MongoDB connection** — a slow product search query blocks the same connection pool used by checkout. | Entire monolith | 🟡 Medium |
| P8 | **Typesense sync is inline** — `upsertProductInTypesense()` is awaited inside `createProduct()` and `updateProduct()`. If Typesense is slow/down, the seller gets an error on product creation. | `product.service.ts:122, 176` | 🟡 Medium |
| P9 | **Welcome email is enqueued inside `register()`** — coupling auth service to the email queue. | `auth.service.ts:57-62` | 🟠 Low-Med |

### 2.2 Admin Backend (FastAPI `admin-backend`)

| # | Pain Point | Where it lives | Risk |
|---|---|---|---|
| A1 | **Admin reads directly from the shared MongoDB** — heavy aggregation queries (`$unwind`, `$group` on orders) run on the same DB instance as the live marketplace. | `sellers.py:32-39`, `stats.py:22-28` | 🔴 High |
| A2 | **User deletion is a hard delete** — `DELETE /users/{id}` calls `delete_one()` with no event emitted. The Node.js backend still holds JWTs for that user; the user's orders/products become orphaned. | `users.py:37-45` | 🔴 High |
| A3 | **Product moderation has no downstream effect** — `moderate_product` soft-deletes in MongoDB but does NOT remove from Typesense or invalidate caches. | `products.py:23-36` | 🔴 High |
| A4 | **No audit log** — admin actions (delete user, moderate product) leave no trace. | All routers | 🟡 Medium |
| A5 | **Seller stats are computed on-the-fly** — no caching; every `/sellers/{id}/stats` call runs a full `$unwind + $group` aggregation. | `sellers.py:23-45` | 🟠 Low-Med |
| A6 | **JWT secret is hardcoded in docker-compose** — the admin JWT uses a different secret from the Node.js JWT; they can't cross-validate each other. This makes cross-service auth harder. | `docker-compose.yml:123` | 🟡 Medium |

---

## 3. Where to Introduce Microservices

The natural service boundaries follow **bounded contexts** — domains that can evolve independently.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Proposed Microservice Map                                │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Identity Service│  │ Catalog Service  │  │   Order Service          │  │
│  │  (Auth + Users)  │  │ (Products +      │  │   (Checkout + GST        │  │
│  │  Node.js / JWT   │  │  Typesense sync) │  │    + Status lifecycle)   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┬───────────┘  │
│           │                     │                           │               │
│  ┌────────▼─────────┐  ┌────────▼─────────┐  ┌─────────────▼────────────┐  │
│  │  Payment Service │  │  Chat Service    │  │  Notification Service    │  │
│  │  (Razorpay +     │  │  (Socket.io +    │  │  (Email + Push + SMS)    │  │
│  │   Webhooks)      │  │   persistence)   │  │  Node.js / Python        │  │
│  └────────┬─────────┘  └──────────────────┘  └──────────────────────────┘  │
│           │                                                                 │
│  ┌────────▼─────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ Recommendation   │  │  Admin Service   │  │  Analytics Service       │  │
│  │ Service          │  │  (FastAPI +      │  │  (Read-only replica /    │  │
│  │ (Redis co-occur) │  │   Audit log)     │  │   materialized views)    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decomposition Rationale

| Microservice | Why split? | Owns |
|---|---|---|
| **Identity** | Auth is cross-cutting; isolated JWT issuer means all services can validate tokens without DB lookups | `users`, `auth tokens` |
| **Catalog** | Product CRUD + Typesense sync can scale independently from checkout; sellers update products frequently | `products`, `variants`, `typesense index` |
| **Order** | The most complex domain; needs atomic stock reservation, GST computation, status machine; must not block auth or product browsing | `orders`, `cart`, `discount` |
| **Payment** | Needs to receive external webhooks (Razorpay); must stay up independently; has its own retry/reconciliation logic | `payment intents`, `webhook handlers` |
| **Chat** | High-frequency, low-latency; Socket.io with Redis pub/sub already isolated; grows independently | `messages`, `rooms` |
| **Notification** | Email/push/SMS consumers; already partially done with BullMQ email worker | `email jobs`, `push tokens` |
| **Recommendation** | CPU/memory intensive; Redis co-occurrence graph; future ML model candidate | `recommendation data` |
| **Admin** | Already a separate FastAPI service (good!); needs an event consumer to stay in sync | `admin views`, `audit log` |
| **Analytics** | Read-heavy aggregations must not hit the primary DB; listens to domain events | `dashboards`, `reports` |

> [!IMPORTANT]
> **Start with the highest-value splits first.** You don't have to do everything at once.  
> **Phase 1**: Catalog + Notification are the easiest splits.  
> **Phase 2**: Order (hardest because of the atomic checkout problem).  
> **Phase 3**: Payment, Recommendation, Analytics.

---

## 4. How Kafka Fits In — Problem → Topic Mapping

Kafka solves the fundamental problem that **BullMQ (Redis) is not a durable event bus** — it's a job queue tied to a single Redis instance. For cross-service communication with guaranteed delivery and replay, Kafka is the right tool.

### 4.1 Core Kafka Topics

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Kafka Topic Map                                   │
│                                                                      │
│  Domain          │ Topic                      │ Producers → Consumers│
│──────────────────┼────────────────────────────┼──────────────────────│
│  Auth            │ user.registered            │ Identity → Notif     │
│  Auth            │ user.deleted               │ Identity → Admin,    │
│                  │                            │   Order, Catalog     │
│──────────────────┼────────────────────────────┼──────────────────────│
│  Catalog         │ product.created            │ Catalog → Search,    │
│                  │                            │   Admin, Analytics   │
│  Catalog         │ product.updated            │ Catalog → Search,    │
│                  │                            │   Recommendation     │
│  Catalog         │ product.moderated          │ Admin → Catalog,     │
│                  │                            │   Search             │
│──────────────────┼────────────────────────────┼──────────────────────│
│  Order           │ order.checkout.initiated   │ Order → Payment      │
│  Order           │ order.confirmed            │ Order → Notif,       │
│                  │                            │   Analytics, Admin   │
│  Order           │ order.status.changed       │ Order → Notif,       │
│                  │                            │   Analytics          │
│  Order           │ inventory.reserve.request  │ Order → Catalog      │
│  Order           │ inventory.reserve.reply    │ Catalog → Order      │
│──────────────────┼────────────────────────────┼──────────────────────│
│  Payment         │ payment.succeeded          │ Payment → Order,     │
│                  │                            │   Notif, Analytics   │
│  Payment         │ payment.failed             │ Payment → Order,Notif│
│  Payment         │ payment.refunded           │ Payment → Order,Notif│
│──────────────────┼────────────────────────────┼──────────────────────│
│  Chat            │ chat.message.sent          │ Chat → Analytics     │
│                  │                            │   (aggregation only) │
│──────────────────┼────────────────────────────┼──────────────────────│
│  Recommendation  │ recommendation.update      │ Order → Recommend    │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Kafka Solves Each Pain Point

| Pain Point | How Kafka Fixes It |
|---|---|
| **P1 — god checkout transaction** | `order.checkout.initiated` event fires after order is persisted. Stock deduction, discount increment, cart clear, email → all become consumers. Order service returns fast. |
| **P2 — non-atomic stock deduction** | Catalog service consumes `inventory.reserve.request`, uses a Kafka request-reply pattern + optimistic locking in MongoDB (or a saga). |
| **P3 — payment stub must receive webhooks** | Payment service is its own container. It publishes `payment.succeeded` / `payment.failed`. Order service listens and transitions status. |
| **P4 — silent order status changes** | Order service publishes `order.status.changed`. Notification service consumes it and sends buyer email/push. |
| **P5 — recommendation coupling** | `order.confirmed` event includes cart item IDs. Recommendation service is a pure consumer — no coupling to order at all. |
| **P6 — chat DB writes on API** | Chat service publishes `chat.message.sent` Kafka event. A separate persistence consumer writes to MongoDB asynchronously. |
| **P8 — inline Typesense sync** | Catalog service publishes `product.created` / `product.updated`. A dedicated search-indexer consumer calls Typesense — the seller's mutation returns immediately. |
| **A1 — admin queries hit live DB** | Analytics service consumes domain events and maintains its own read-optimised MongoDB collection (CQRS read model). |
| **A2 — hard delete with no propagation** | Admin publishes `user.deleted`. Order service marks orders as `ORPHANED`; Identity service revokes JWT; Catalog service flags products. |
| **A3 — moderation no downstream effect** | Admin publishes `product.moderated`. Search-indexer consumer removes from Typesense. Catalog consumer sets `isDeleted: true`. |
| **A4 — no audit log** | A generic `audit.event` topic. Every admin action publishes an event. A dedicated audit consumer appends to an immutable audit log collection. |

### 4.3 Kafka Consumer Groups

```
Topic: order.confirmed
  ├── consumer-group: notification-service     → sends buyer email
  ├── consumer-group: analytics-service        → updates revenue metrics
  ├── consumer-group: admin-service            → updates admin dashboard cache
  └── consumer-group: recommendation-service   → updates co-occurrence graph

Topic: product.created
  ├── consumer-group: search-indexer           → upserts in Typesense
  └── consumer-group: analytics-service        → updates product count metrics

Topic: user.deleted
  ├── consumer-group: catalog-service          → soft-delete seller products
  ├── consumer-group: order-service            → orphan open orders
  └── consumer-group: admin-service            → write audit log entry
```

---

## 5. Saga Pattern for Checkout (The Hardest Problem)

The atomic checkout (P1 + P2) requires a **distributed saga** with Kafka:

```
Buyer calls checkout mutation
       │
       ▼
[Order Service]
  1. Create order document (status: AWAITING_RESERVATION)
  2. Publish: inventory.reserve.request  ─────────────────────────────┐
       │                                                               ▼
       │                                                  [Catalog Service]
       │                                                    Tries to reserve stock
       │                                                    for all items atomically
       │
  ◄────┤ Receives: inventory.reserve.reply
       │
  ┌────┴───────────────────────────────────────────────────┐
  │ Reply = SUCCESS?                                        │
  │   YES → status: RESERVED                               │
  │         Publish: order.checkout.initiated              │
  │         Consumers: Discount, Cart-Clear, Notification  │
  │   NO  → status: FAILED (insufficient stock)            │
  │         Publish: order.checkout.failed                 │
  │         Consumers: Notification (apologize to user)    │
  └────────────────────────────────────────────────────────┘
```

> [!NOTE]
> **Compensating transactions** must be implemented for each saga step.  
> If notification fails, it can retry independently (Kafka consumer retry).  
> If inventory reservation fails after order creation, publish a **compensate.order.cancel** event.

---

## 6. What Stays on BullMQ (Redis) vs. Moves to Kafka

Not everything needs Kafka. Keep the right tool for the right job:

| Use Case | Keep BullMQ (Redis) | Move to Kafka |
|---|---|---|
| Email sending | ✅ BullMQ is perfect — retries, exponential backoff, Bull Board monitoring | — |
| Recommendation graph update | ✅ Small, intra-service, Redis-native sorted sets | — |
| Cross-service domain events | — | ✅ Kafka — durable, replay, multiple consumers |
| Payment webhook handling | — | ✅ Kafka — must survive spikes, need replay |
| Audit log | — | ✅ Kafka — immutable event stream |
| Search index sync | — | ✅ Kafka — decouple from product writes |
| Order status notifications | — | ✅ Kafka — multi-consumer (email + push + analytics) |

> [!TIP]
> **Think of BullMQ as a task queue** (unit of work for one consumer) and **Kafka as an event bus** (a thing that happened, consumed by many).

---

## 7. Phased Migration Roadmap

### Phase 1 — Quick Wins (1–2 weeks each)

| Task | Description | Fixes |
|---|---|---|
| 1.1 | **Decouple Typesense sync** — publish `product.created` / `product.updated` Kafka events; create a `search-indexer` microservice or consumer | P8 |
| 1.2 | **Admin audit log** — publish `audit.event` for every admin mutation; consumer writes to `audit_logs` collection | A4 |
| 1.3 | **Fix admin moderation** — `product.moderated` event → search-indexer removes from Typesense | A3 |
| 1.4 | **User deletion propagation** — `user.deleted` event → catalog soft-deletes, order orphans | A2 |

### Phase 2 — Notification Service (2–3 weeks)

| Task | Description | Fixes |
|---|---|---|
| 2.1 | Extract email.worker into a standalone **Notification Service** | P9, P4 |
| 2.2 | Subscribe to `order.confirmed`, `order.status.changed`, `user.registered` | P4 |
| 2.3 | Add push notification capability (Firebase/APNs) | New feature |

### Phase 3 — Order Saga (3–4 weeks)

| Task | Description | Fixes |
|---|---|---|
| 3.1 | Implement **inventory reservation** via Kafka request-reply in Catalog Service | P1, P2 |
| 3.2 | Split checkout into saga steps with compensating transactions | P1 |
| 3.3 | Publish `order.checkout.initiated` for downstream consumers | P1 |

### Phase 4 — Payment & Analytics (4–6 weeks)

| Task | Description | Fixes |
|---|---|---|
| 4.1 | Extract **Payment Service** — real Razorpay integration + webhook endpoint | P3 |
| 4.2 | Build **Analytics Service** — consumes events, maintains CQRS read models | A1, A5 |
| 4.3 | Admin backend reads from Analytics Service instead of live MongoDB | A1 |

---

## 8. Kafka Infrastructure Additions to docker-compose

```yaml
# Add to docker-compose.yml

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on:
      - zookeeper
    ports:
      - '9092:9092'
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - '8080:8080'
    environment:
      KAFKA_CLUSTERS_0_NAME: gearswap
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```

**Kafka clients by service:**

| Service | Language | Kafka Library |
|---|---|---|
| Node.js backend | TypeScript | `kafkajs` |
| Admin backend | Python | `confluent-kafka-python` or `aiokafka` |
| Notification service | Node.js or Python | `kafkajs` / `aiokafka` |
| Search indexer | Node.js or Python | Either |

---

## 9. Summary of Decisions

```
┌───────────────────────────────────────────────────────────────────┐
│                  Architectural Decision Summary                   │
│                                                                   │
│  KEEP as-is                                                       │
│     • BullMQ for email background jobs                           │
│     • Redis for Socket.io pub/sub (chat scaling)                 │
│     • Redis sorted sets for recommendation co-occurrence         │
│     • Typesense for full-text search                             │
│     • FastAPI admin service (already separated — good!)          │
│                                                                   │
│  FIX immediately (no Kafka needed)                               │
│     • Hard delete in admin → soft delete + event                 │
│     • Admin product moderation → also update Typesense           │
│     • Typesense sync → make async (fire-and-forget)              │
│     • JWT secret → share one secret across services              │
│                                                                   │
│  INTRODUCE Kafka for                                              │
│     • Cross-service domain events (order, user, product)         │
│     • Audit log stream                                           │
│     • Payment webhook events                                     │
│     • Multi-consumer notification fan-out                        │
│     • Analytics CQRS read-model population                       │
│                                                                   │
│  EXTRACT as microservices (priority order)                       │
│     1. Notification Service (email + push)                       │
│     2. Search Indexer (Typesense sync)                           │
│     3. Catalog Service (product + inventory)                     │
│     4. Payment Service (Razorpay + webhooks)                    │
│     5. Analytics Service (CQRS read models)                      │
└───────────────────────────────────────────────────────────────────┘
```

> [!WARNING]
> **Do not split the Order + Cart domain prematurely.** It is the most complex bounded context because of the atomic checkout saga. Get Phase 1 (quick wins) done first, then revisit. Attempting the saga too early without Kafka infrastructure being stable is a common migration mistake.

---

*Generated by Antigravity AI — GearSwap Marketplace codebase, April 2026*
