# Suggestions for Super Admin Implementation

This document outlines the proposed architecture and features for the Super Admin dashboard and management system for the GearSwap Marketplace.

## 1. Authentication & Role-Based Access Control (RBAC)

### Add `SUPER_ADMIN` Role
Modify `backend/src/modules/auth/auth.model.ts` to include the new role:
```typescript
export enum UserRole {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
    SUPER_ADMIN = 'SUPER_ADMIN', // New Role
}
```

### Secure GraphQL Resolvers
Implement a middleware or use a library like `graphql-shield` to protect admin-only operations.
- **Admin-Only Queries**: `getAllUsers`, `getAllSellers`, `getGlobalAnalytics`, `getAuditLogs`.
- **Admin-Only Mutations**: `updateUserStatus`, `approveSeller`, `removeInappropriateProduct`.

---

## 2. Super Admin Dashboard: What to See & Manage

### A. User Management (Buyers)
The Super Admin needs a bird's-eye view of all platform participants.
- **Required Details**:
    - Registration date and last login.
    - Total orders placed and total spend.
    - Status (Active, Suspended, Banned).
- **Management Actions**:
    - Block/Unblock users for policy violations.
    - Manually trigger password resets.
    - View user communication logs (for dispute resolution).

### B. Seller Management
Sellers are the backbone of the marketplace; they require closer monitoring.
- **Required Details**:
    - Business name, GSTIN, and registration details.
    - Total products listed vs. active products.
    - Total revenue (GMV) and pending payouts.
    - Seller rating and return/cancellation rates.
- **Management Actions**:
    - **Verification**: Approve new sellers after reviewing their documents.
    - **Commission**: Set custom commission rates per seller.
    - **Storefront Control**: Feature certain sellers on the homepage.
    - **Dashboard Mirroring**: A tool to view the "Live" dashboard exactly as the seller sees it.

### C. Cross-Dashboard Management
A Super Admin should be able to influence both Seller and User experiences simultaneously:
- **Site-Wide Configuration**:
    - Manage "Service-Wide Message" or "Maintenance Mode" banners.
    - Toggle specific features (e.g., "Enable Gifting", "Disable Chat").
- **User Impersonation**:
    - Securely "Log in as" a User or Seller to troubleshoot reported issues.
    - View the user's current Cart or Order status to assist with support requests.
- **Support & Dispute Center**:
    - A centralized area to read and participate in Chat logs between Sellers and Buyers for mediation.

### C. Product Moderation
Ensuring quality and legality of items listed.
- **Required Details**:
    - Global list of all products across all sellers.
    - Flagged products (reported by users).
    - High-stock vs. Out-of-stock items.
- **Management Actions**:
    - Bulk update categories.
    - Delete/Hide products that violate marketplace rules.

### D. Order & Financial Oversight
- **Required Details**:
    - Real-time stream of all orders.
    - Payment status (Pending, Paid, Failed).
    - Platform-wide GST reports (Tax collected).
- **Management Actions**:
    - Refund processing.
    - Status overrides (e.g., manually marking a stuck order as "Completed").

---

## 3. Global Analytics (The "Super" View)

The Dashboard should feature a summary section for quick decision-making:
1.  **Key Performance Indicators (KPIs)**:
    - Total Registered Users (Growth chart).
    - Active Sellers count.
    - Daily/Monthly Revenue.
2.  **Infrastructure Health**:
    - Status of Redis queues (BullMQ).
    - Typesense Search Index sync status.
3.  **Conflict Resolution**:
    - Open chat tickets between Buyers and Sellers.

---

## 4. Frontend Implementation Suggestions

### Dedicated Admin Layout
- Create a specific layout in Next.js (e.g., `/app/admin/**`) with a sidebar for navigation.
- Use **TanStack Table (React Table)** for high-performance data grids with filtering/sorting.
- Use **Recharts** or **Chart.js** for visualizing sales and user growth.

### Access Control on Frontend
- Ensure the Admin Dashboard is not only hidden but also protected via route guards.
- Redirect non-admin users to `/` if they attempt to access `/admin`.

---

## 5. First Step: Seeding the Admin
Create a script to promote an existing user or create a new one with the `SUPER_ADMIN` role:
```typescript
// backend/src/scripts/create-admin.ts
const admin = await User.create({
    email: 'admin@gearswap.com',
    password: 'securepassword',
    role: UserRole.SUPER_ADMIN
});
```

---

---

# N+1 Query Analysis — GraphQL Resolvers

This section documents every N+1 query problem found across the resolver/service layer and how to fix each one.

---

## Issue 1 — `getCartWithPricing`: N product queries per cart item (**CRITICAL**)

**Files**: `backend/src/modules/cart/cart.service.ts` → `CartService.getCartWithPricing()`
**Triggered by**: `myCart`, `addToCart`, `updateCartItem`, `removeFromCart`, `applyDiscount`, `removeDiscount` resolvers

### Problem
The method loops over every cart item and fires a separate `Product.findOne()` per item:

```typescript
// ❌ N+1: one DB query per cart item
for (const item of cart.items) {
    const variantData = await productService.getVariantBySku(
        item.productId.toString(),
        item.variantId.toString()
    );
    // ...
}
```

A cart with 10 items triggers **1 cart fetch + 10 product fetches = 11 queries**.

### Fix — Batch fetch all products in one query

```typescript
// ✅ 1 query for all products regardless of cart size
const productIds = cart.items.map(item => item.productId);
const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
});

// Build a lookup map keyed by productId string
const productMap = new Map(products.map(p => [p._id.toString(), p]));

for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    if (!product) { hasOrphanedItems = true; continue; }

    const variant = product.variants.find(
        v => v._id?.toString() === item.variantId.toString()
    );
    if (!variant) { hasOrphanedItems = true; continue; }
    // ... rest of pricing logic unchanged
}
```

**Query count**: 11 → **2** (1 cart + 1 batched product find).

---

## Issue 2 — `checkout`: THREE separate N loops = 2N–3N DB queries (**CRITICAL**)

**Files**: `backend/src/modules/order/order.service.ts` → `OrderService.checkout()`
**Triggered by**: `checkout` mutation

### Problem

Checkout with N cart items fires these sequential DB operations:

| Step | Call | Queries |
|------|------|---------|
| 1 | `cartService.getCartWithPricing()` | N (Issue 1 above — each item is a separate `Product.findOne`) |
| 2 | First `for` loop inside `checkout()` — `productService.getVariantBySku()` per item for GST data | N |
| 3 | Second `for` loop — `productService.updateVariantStock()` per item (each does `findOne` + `save`) | 2N |

A 5-item checkout triggers **5 + 5 + 10 = 20+ extra product queries** on top of the order create.

### Fix A — Batch product fetch replacing the GST loop

```typescript
// ✅ Replace the per-item getVariantBySku loop with one batch fetch
const productIds = cartData.items.map(item =>
    new mongoose.Types.ObjectId(item.productId)
);
const products = await Product.find({
    _id: { $in: productIds },
    isDeleted: false,
});
const productMap = new Map(products.map(p => [p._id.toString(), p]));

for (const item of cartData.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productName}`);

    const variant = product.variants.find(
        v => v._id?.toString() === item.variantId
    );
    if (!variant) throw new Error(`Variant not found: ${item.variantSku}`);
    // ... GST calculation unchanged
}
```

### Fix B — Batch stock deduction with `bulkWrite` instead of N save calls

```typescript
// ❌ N separate findOne + save calls (current)
for (const item of cartData.items) {
    await productService.updateVariantStock(item.productId, item.variantId, -item.quantity);
}

// ✅ One bulkWrite for all stock decrements
const stockOps = cartData.items.map(item => ({
    updateOne: {
        filter: {
            _id: new mongoose.Types.ObjectId(item.productId),
            'variants._id': new mongoose.Types.ObjectId(item.variantId),
            'variants.stock': { $gte: item.quantity }, // safety guard
        },
        update: {
            $inc: { 'variants.$.stock': -item.quantity },
        },
    },
}));
const result = await Product.bulkWrite(stockOps);

// Verify all updates succeeded
if (result.modifiedCount !== cartData.items.length) {
    throw new Error('Stock change failed — some items may be out of stock');
}
```

**Query count after both fixes**: ~25 → **4** (1 `getOrCreateCart` + 1 batch product find + 1 `Order.create` + 1 `bulkWrite`).

---

## Issue 3 — `getSellerStats`: Full order scan in JavaScript instead of DB aggregation

**Files**: `backend/src/modules/order/order.service.ts` → `OrderService.getSellerStats()`
**Triggered by**: `sellerStats` resolver

### Problem

Fetches **all order documents** into memory, then iterates them in JS to sum revenue and count pending orders:

```typescript
// ❌ Loads every order document just to compute 3 numbers
const orders = await this.listSellerOrders(sellerId); // full docs in memory
for (const order of orders) {
    const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId);
    totalRevenue += sellerItems.reduce((sum, item) => sum + item.subtotal, 0);
    if (order.status === OrderStatus.PENDING) pendingOrders++;
}
```

For a seller with 1000 orders this transfers thousands of full documents just to produce 3 numbers.

### Fix — MongoDB `$aggregate` pipeline

```typescript
// ✅ Single aggregation — no documents loaded into memory
async getSellerStats(sellerId: string) {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    const [result] = await Order.aggregate([
        { $match: { 'items.sellerId': sellerObjectId } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerObjectId } },
        {
            $group: {
                _id: null,
                totalOrders: { $addToSet: '$_id' },
                totalRevenue: { $sum: '$items.subtotal' },
                pendingOrders: {
                    $sum: {
                        $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                totalOrders: { $size: '$totalOrders' },
                totalRevenue: 1,
                pendingOrders: 1,
            },
        },
    ]);

    return result ?? { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
}
```

**Query count**: N order documents loaded → **1 aggregation pipeline**.

---

## Issue 4 — `Product.seller` resolver: hidden coupling to service-level `populate`

**Files**: `backend/src/modules/product/product.resolvers.ts` → `productResolvers.Product.seller`

### Problem

The field resolver simply returns `parent.sellerId` and relies on every service call having `.populate('sellerId', 'email')`. If any code path fetches a product without `populate`, the resolver silently returns a raw `ObjectId` instead of a `User` object — no error, just wrong data.

```typescript
// ❌ Fragile — breaks silently if populate is ever missing
Product: {
    seller: async (parent: any) => {
        return parent.sellerId; // passes through whatever populate did
    },
},
```

When querying a list of products where multiple products share the same seller, Mongoose's `populate` does batch the lookups. However, that only works because the populate call is currently in every service method — a detail that is easy to forget.

### Fix — DataLoader to batch-load sellers by ID at the resolver level

```typescript
// context setup (e.g., in Apollo Server context factory)
import DataLoader from 'dataloader';
import { User } from '../modules/auth/auth.model';

function createLoaders() {
    return {
        sellerLoader: new DataLoader(async (ids: readonly string[]) => {
            const users = await User.find({ _id: { $in: ids } }).select('email').lean();
            const map = new Map(users.map(u => [u._id.toString(), u]));
            return ids.map(id => map.get(id) ?? null);
        }),
    };
}

// In product.resolvers.ts
Product: {
    seller: (parent: any, _: any, context: GraphQLContext) => {
        const id = parent.sellerId?._id?.toString() ?? parent.sellerId?.toString();
        return context.loaders.sellerLoader.load(id);
    },
},
```

Remove all `.populate('sellerId', 'email')` calls from the service layer — the DataLoader handles deduplication and batching automatically across all concurrent resolvers in a single request.

---

## Issue 5 — `cartRecommendations`: double cart fetch in same GraphQL request

**Files**: `backend/src/modules/cart/cart.resolvers.ts` → `cartResolvers.Query.cartRecommendations`

### Problem

When a client sends `{ myCart { ... } cartRecommendations { ... } }` in one request, the cart is fetched independently by each resolver:

```typescript
// myCart resolver
myCart: async (_, __, context) => {
    return cartService.getCartWithPricing(user.userId); // Cart.findOne() #1
},

// cartRecommendations resolver
cartRecommendations: async (_, { limit }, context) => {
    const cart = await cartService.getOrCreateCart(user.userId); // Cart.findOne() #2 — duplicate
    // ...
},
```

### Fix — Request-scoped cart cache via DataLoader

```typescript
// In context factory
cartLoader: new DataLoader(async (buyerIds: readonly string[]) => {
    const carts = await Cart.find({
        buyerId: { $in: buyerIds.map(id => new mongoose.Types.ObjectId(id)) },
    });
    const map = new Map(carts.map(c => [c.buyerId.toString(), c]));
    return buyerIds.map(id => map.get(id) ?? null);
}, { cache: true }), // cache:true (default) deduplicates within the same request
```

Or more simply, add a lightweight in-memory per-request memoisation in `CartService.getOrCreateCart()` using a `Map` stored on the context object.

---

## Summary Table

| # | Location | Pattern | Queries (N items) | Fix |
|---|----------|---------|-------------------|-----|
| 1 | `CartService.getCartWithPricing` | `for` loop + `findOne` per item | 1 + N | Batch `Product.find({ $in })` |
| 2a | `OrderService.checkout` — GST loop | `for` loop + `getVariantBySku` per item | N | Batch `Product.find({ $in })` |
| 2b | `OrderService.checkout` — stock loop | `for` loop + `findOne + save` per item | 2N | `Product.bulkWrite` with `$inc` |
| 3 | `OrderService.getSellerStats` | Full doc scan in JS for 3 numbers | All orders in memory | MongoDB `$aggregate` pipeline |
| 4 | `productResolvers.Product.seller` | Relies on service-level populate | Per-product populate | DataLoader on context |
| 5 | `cartResolvers.cartRecommendations` | Duplicate cart fetch per resolver | 2× cart queries | Request-scoped DataLoader/cache |

> **Highest priority**: Issues 1, 2a, and 2b — they compound each other. A single `checkout` call with 5 cart items currently issues ~20 DB round-trips; after fixes it reduces to 4.
