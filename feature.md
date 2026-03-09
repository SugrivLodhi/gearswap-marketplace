# Gearswap Marketplace: Feature Roadmap & Ideas

Based on the scan of your architecture (GraphQL Federation, Microservices, BullMQ, Next.js, and core modules like `auth`, `cart`, `discount`, `order`, `payment`, `product`), here is a curated list of features you can implement next to elevate your marketplace.

They are categorized by complexity and impact. 

---

## 🚀 Phase 1: High Impact, Moderate Effort

### 1. "Make an Offer" / Negotiation System
In gear marketplaces, prices are rarely static. Buyers expect to negotiate.
* **How it works:** Alongside the `Add to Cart` button, add a `Make an Offer` button. 
* **Implementation Ideas:**
  * Create an `Offer` entity (Buyer ID, Seller ID, Product ID, Offered Price, Status: Pending/Accepted/Declined).
  * Use **BullMQ** to set a 24-hour expiration on offers. If the seller doesn't respond, the job automatically expires the offer.
  * Send email notifications to the seller using your existing `email.worker.ts`.

### 2. Wishlists & "Save for Later"
Users often browse expensive gear but take days to decide.
* **How it works:** Allow users to bookmark items.
* **Implementation Ideas:**
  * Create a simple `Wishlist` module. 
  * In the frontend, use an optimistic UI update (Apollo Client `writeQuery`) so the heart icon fills instantly when clicked.

### 3. Vendor Ratings & Reviews
Peer-to-peer marketplaces run on trust. 
* **How it works:** Buyers can rate sellers 1-5 stars and leave a text review **only after** an order transitions to `COMPLETED`.
* **Implementation Ideas:**
  * Create a `Review` module. 
  * Cache the average rating on the `User` (seller) document using a database trigger or periodic background job so you don't have to calculate it on every profile load.

---

## 🔥 Phase 2: Engagement & Growth

### 4. Saved Searches & Price Drop Alerts (Event-Driven)
Keep users coming back with automated notifications.
* **How it works:** A user saves a search (e.g., "Fender Stratocaster under $1000"). When a new product matching this is listed, or a price drops, they get an email.
* **Implementation Ideas:**
  * Utilize your `catalog-search` microservice.
  * Create a **BullMQ Repeater Job** (Cron) that runs every 15 minutes, matches new products against the `SavedSearch` table, and queues emails via your email worker.

### 5. Social Login (Google / Apple / GitHub)
Reduce friction during signup to increase conversions.
* **How it works:** 1-click login.
* **Implementation Ideas:**
  * Expand your `auth` module.
  * Use a library like `passport-google-oauth20`. Once authenticated by the provider, issue your existing standard backend JWT so the rest of your app requires zero changes.

---

## 🏗️ Phase 3: Advanced Marketplace Mechanics

### 6. Real-time Buyer-Seller Chat
Sometimes an offer is too formal; a buyer just wants to ask, "Are there any scratches on the back?"
* **Implementation Ideas:**
  * Implement **GraphQL Subscriptions** (via Apollo Server) or use **Socket.io**.
  * Use **Redis Pub/Sub** (you already have Redis configured for rate limiting and BullMQ!) to scale the chat across multiple backend instances.
  * Store messages in MongoDB for fast retrieval.

### 7. Multi-party Payments & Escrow (Stripe Connect)
If you aren't doing this already, managing seller payouts manually becomes a legal and logistical nightmare.
* **How it works:** The buyer pays $100. Gearswap takes a 10% fee ($10), and the remaining $90 is routed directly to the Seller's connected Stripe account.
* **Implementation Ideas:**
  * Expand the `payment` module.
  * Implement **Stripe Connect** (Custom or Express accounts).
  * Hold the funds in Escrow (authorize the card) until the buyer marks the item as 'Received', then Capture the charge and distribute the payout.

---

## 🛠️ Developer Experience (DX) Features
* **Admin Dashboard:** Next.js hidden routes (`/admin/*`) guarded by role-based access control (RBAC) in your JWTs to monitor active users, revenue, and queue health (integrate `@bull-board/express` which is in your `package.json`!). 
* **Elasticsearch/Typesense:** If your `catalog-search` is using standard SQL/Mongo, consider offloading search to Typesense or Elasticsearch for fuzzy matching ("Startocaster" -> "Stratocaster").
