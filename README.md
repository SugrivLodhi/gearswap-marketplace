# GearSwap Marketplace - Microservices Architecture

## 🎯 Overview

This project has been migrated from a monolithic architecture to a **production-grade microservices architecture** with:

- **2 Backend Microservices** (Commerce Core + Catalog & Search)
- **GraphQL Federation Gateway** (single client endpoint)
- **4 Databases** (PostgreSQL, MongoDB, Redis, Elasticsearch)
- **Event-Driven Communication** (Redis Pub/Sub)
- **Background Job Processing** (BullMQ)
- **Docker Compose** orchestration

---

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  GraphQL Gateway     │  ← Single endpoint (Port 4000)
│  (Apollo Federation) │
└──────┬───────────────┘
       │
       ├──────────────────────┬──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────────┐    ┌──────────────────┐   ┌──────────┐
│ Commerce Core   │    │ Catalog & Search │   │  Redis   │
│   (Port 4001)   │    │   (Port 4002)    │   │  Cache   │
├─────────────────┤    ├──────────────────┤   └──────────┘
│ • Auth          │    │ • Products       │
│ • Cart          │    │ • Search         │
│ • Orders        │    │                  │
│ • Payments      │    │                  │
│ • Discounts     │    │                  │
├─────────────────┤    ├──────────────────┤
│   PostgreSQL    │    │    MongoDB       │
│  (Transactional)│    │  (Flexible)      │
└─────────────────┘    │  Elasticsearch   │
                       │  (Search Engine) │
                       └──────────────────┘
```

---

## 📦 Services

### 1. GraphQL Gateway (Port 4000)
- **Technology**: Apollo Gateway with Federation v2
- **Purpose**: Single GraphQL endpoint for frontend
- **Features**: Schema composition, automatic polling, health checks

### 2. Commerce Core Service (Port 4001)
- **Database**: PostgreSQL (ACID transactions)
- **Modules**: auth, cart, order, payment, discount
- **Features**: JWT authentication, Redis caching, BullMQ jobs, event publishing

### 3. Catalog & Search Service (Port 4002)
- **Databases**: MongoDB + Elasticsearch
- **Modules**: product, search
- **Features**: Product catalog, full-text search, faceted filtering, product indexing

### 4. Infrastructure
- **PostgreSQL** (Port 5432): Transactional data
- **MongoDB** (Port 27017): Product catalog
- **Redis** (Port 6379): Caching + Pub/Sub
- **Elasticsearch** (Port 9200): Search engine
- **Redis Commander** (Port 8081): Optional monitoring

---

## 🚀 Quick Start

### Prerequisites
- **Docker** and **Docker Compose** installed
- **Node.js** 18+ (for local development)
- **npm** or **yarn**

### 1. Start All Services

```bash
# Clone the repository (if not already)
cd gearswap-marketplace

# Start all services with Docker Compose
docker-compose up -d

# Check service health
docker-compose ps
```

### 2. Install Dependencies

```bash
# Gateway
cd gateway
npm install

# Commerce Core
cd ../commerce-core
npm install

# Catalog & Search
cd ../catalog-search
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run Database Migrations

```bash
# PostgreSQL migrations for Commerce Core
docker exec gearswap-commerce-core npm run migrate
```

### 4. Seed Test Data (Optional)

```bash
# Seed MongoDB with products (existing script)
cd backend
npm run seed

# Note: You'll need to migrate users/orders/discounts from MongoDB to PostgreSQL
```

### 5. Access Services

- **GraphQL Gateway**: http://localhost:4000/graphql
- **Commerce Core**: http://localhost:4001/graphql
- **Catalog & Search**: http://localhost:4002/graphql
- **Redis Commander**: http://localhost:8081
- **Elasticsearch**: http://localhost:9200

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:3000

---

## 📂 Project Structure

```
gearswap-marketplace/
├── docker-compose.yml          # All services orchestration
│
├── gateway/                    # GraphQL Gateway
│   ├── src/
│   │   ├── index.ts           # Apollo Gateway setup
│   │   └── config/
│   ├── package.json
│   └── Dockerfile
│
├── commerce-core/              # Commerce Core Service
│   ├── src/
│   │   ├── config/            # DB, Redis, BullMQ
│   │   ├── modules/
│   │   │   ├── auth/          # ✅ Complete
│   │   │   ├── cart/          # ⏳ TODO
│   │   │   ├── order/         # ⏳ TODO
│   │   │   ├── discount/      # ⏳ TODO
│   │   │   └── payment/       # ⏳ TODO
│   │   ├── jobs/              # BullMQ workers
│   │   ├── events/            # Event publishers/subscribers
│   │   ├── middleware/        # Auth guard
│   │   ├── graphql/           # Combined schema/resolvers
│   │   └── index.ts           # Server entry point
│   ├── migrations/            # PostgreSQL migrations
│   ├── package.json
│   └── Dockerfile
│
├── catalog-search/             # Catalog & Search Service
│   ├── src/
│   │   ├── config/            # MongoDB, Elasticsearch
│   │   ├── modules/
│   │   │   ├── product/       # ⏳ TODO (copy from backend)
│   │   │   └── search/        # ⏳ TODO
│   │   ├── jobs/              # Product indexing workers
│   │   ├── events/            # Event publishers/subscribers
│   │   ├── graphql/           # Combined schema/resolvers
│   │   └── index.ts           # Server entry point
│   ├── package.json
│   └── Dockerfile
│
├── backend/                    # ⚠️ OLD MONOLITH (for reference)
│   └── src/modules/           # Copy modules from here
│
├── frontend/                   # Next.js Frontend
│   └── lib/apollo-client.ts   # ⚠️ Update to point to gateway
│
└── README.md                   # This file
```

---

## 🔧 Development Workflow

### Running Services Locally (Without Docker)

#### 1. Start Databases

```bash
# Start only databases with Docker
docker-compose up -d postgres mongodb redis elasticsearch
```

#### 2. Run Services Locally

```bash
# Terminal 1: Commerce Core
cd commerce-core
npm run dev

# Terminal 2: Catalog & Search
cd catalog-search
npm run dev

# Terminal 3: Gateway
cd gateway
npm run dev

# Terminal 4: Frontend
cd frontend
npm run dev
```

### Testing GraphQL Federation

```bash
# Open GraphQL Playground
open http://localhost:4000/graphql

# Test cross-service query
query {
  me {
    id
    email
    role
  }
}

# Test product query (once implemented)
query {
  products(pagination: { limit: 10 }) {
    edges {
      node {
        id
        name
        seller {
          email  # Resolved from Commerce Core!
        }
      }
    }
  }
}
```

---

## ⚠️ Remaining Implementation Tasks

### High Priority

#### 1. Complete Commerce Core Modules
- [ ] **Cart Module**: Migrate from MongoDB to PostgreSQL
  - Copy from `backend/src/modules/cart/`
  - Update to use PostgreSQL models
  - Add product fetching from Catalog service
  - Implement Redis caching

- [ ] **Order Module**: Migrate from MongoDB to PostgreSQL
  - Copy from `backend/src/modules/order/`
  - Update to use PostgreSQL models
  - Implement Saga pattern for distributed transactions
  - Add event publishing (`order.created`, `order.paid`)

- [ ] **Discount Module**: Migrate from MongoDB to PostgreSQL
  - Copy from `backend/src/modules/discount/`
  - Update to use PostgreSQL models
  - Add Redis caching for active discounts

- [ ] **Payment Module**: Keep existing logic
  - Copy from `backend/src/modules/payment/`

#### 2. Complete Catalog & Search Service
- [ ] **Product Module**: Copy from existing backend
  - Copy `backend/src/modules/product/product.model.ts`
  - Copy `backend/src/modules/product/product.service.ts`
  - Update resolvers for Federation
  - Add reference resolver for `seller: User`

- [ ] **Search Module**: Implement Elasticsearch queries
  - Create search service with Elasticsearch client
  - Implement full-text search
  - Implement faceted filtering
  - Add Redis caching for search results

#### 3. Event-Driven Communication
- [ ] Create event publishers (Commerce Core)
  - `order.created`, `order.paid`, `order.shipped`
- [ ] Create event subscribers (Catalog & Search)
  - Subscribe to `order.created` → deduct stock
- [ ] Create event publishers (Catalog & Search)
  - `product.updated`, `stock.deducted`, `stock.deduction.failed`
- [ ] Create event subscribers (Commerce Core)
  - Subscribe to `stock.deduction.failed` → cancel order

#### 4. BullMQ Workers
- [ ] Order processing worker (Commerce Core)
  - Process payments
  - Send confirmation emails
- [ ] Email worker (Commerce Core)
  - Send emails via SMTP
- [ ] Product indexing worker (Catalog & Search)
  - Index products to Elasticsearch
- [ ] Stock sync worker (Catalog & Search)
  - Sync stock from order events

#### 5. Data Migration
- [ ] Export users from MongoDB
- [ ] Import users to PostgreSQL
- [ ] Export carts from MongoDB
- [ ] Import carts to PostgreSQL
- [ ] Export orders from MongoDB
- [ ] Import orders to PostgreSQL
- [ ] Export discounts from MongoDB
- [ ] Import discounts to PostgreSQL
- [ ] Keep products in MongoDB
- [ ] Index all products to Elasticsearch

#### 6. Frontend Integration
- [ ] Update `frontend/lib/apollo-client.ts`
  - Change URI to `http://localhost:4000/graphql` (gateway)
- [ ] Test all existing features
- [ ] Verify backward compatibility

---

## 🧪 Testing

### Health Checks

```bash
# Check all services
curl http://localhost:4000/health  # Gateway
curl http://localhost:4001/health  # Commerce Core
curl http://localhost:4002/health  # Catalog & Search
```

### GraphQL Queries

```graphql
# Test authentication (Commerce Core)
mutation {
  login(input: { email: "buyer@example.com", password: "buyer123" }) {
    token
    user {
      id
      email
      role
    }
  }
}

# Test products (Catalog & Search)
query {
  products(pagination: { limit: 5 }) {
    edges {
      node {
        id
        name
        category
      }
    }
  }
}
```

---

## 📊 Database Schemas

### PostgreSQL (Commerce Core)
- `users` - User accounts with roles
- `carts` - Shopping carts (one per buyer)
- `cart_items` - Items in carts
- `orders` - Order history
- `order_items` - Items in orders (snapshot)
- `discounts` - Discount codes

### MongoDB (Catalog & Search)
- `products` - Product catalog with variants

### Elasticsearch
- `products` - Indexed products for search

---

## 🔐 Environment Variables

### Gateway
```env
PORT=4000
COMMERCE_CORE_URL=http://localhost:4001/graphql
CATALOG_SEARCH_URL=http://localhost:4002/graphql
CORS_ORIGIN=http://localhost:3000
```

### Commerce Core
```env
PORT=4001
DATABASE_URL=postgresql://gearswap:gearswap_password@localhost:5432/commerce_core
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CATALOG_SERVICE_URL=http://localhost:4002/graphql
```

### Catalog & Search
```env
PORT=4002
MONGODB_URI=mongodb://localhost:27017/gearswap
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379
COMMERCE_CORE_URL=http://localhost:4001/graphql
```

---

## 📚 Documentation

- **[Implementation Plan](./implementation_plan.md)**: Detailed architecture decisions
- **[Walkthrough](./walkthrough.md)**: Implementation progress
- **[Task List](./task.md)**: Remaining tasks
- **[Design Decisions](./DESIGN_DECISIONS.md)**: Original design rationale

---

## 🎯 Benefits of Microservices Architecture

✅ **Scalability**: Scale services independently based on load  
✅ **Fault Isolation**: One service failure doesn't bring down the entire system  
✅ **Technology Flexibility**: Use the right database for each service  
✅ **Team Autonomy**: Teams can work on services independently  
✅ **Deployment Independence**: Deploy services without affecting others  
✅ **Performance**: Optimize each service for its specific workload  

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker logs
docker-compose logs gateway
docker-compose logs commerce-core
docker-compose logs catalog-search

# Restart services
docker-compose restart

# Rebuild services
docker-compose up --build
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker exec -it gearswap-postgres psql -U gearswap -d commerce_core

# Check MongoDB
docker exec -it gearswap-mongodb mongosh

# Check Redis
docker exec -it gearswap-redis redis-cli ping

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

### GraphQL Federation Issues

```bash
# Check gateway can reach subgraphs
curl http://localhost:4001/graphql
curl http://localhost:4002/graphql

# Check gateway logs
docker logs gearswap-gateway
```

---

## 📝 Next Steps

1. **Complete remaining modules** (cart, order, discount, product, search)
2. **Implement event-driven workflows**
3. **Create BullMQ workers**
4. **Migrate data from MongoDB to PostgreSQL**
5. **Update frontend to use gateway**
6. **Test end-to-end functionality**
7. **Deploy to production**

---

## 🤝 Contributing

This is a demonstration project showcasing microservices architecture with GraphQL Federation.

---

## 📄 License

MIT License

---

**Happy coding! 🚀**
