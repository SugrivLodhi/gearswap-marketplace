# Design Decisions & Architecture Analysis

This document details the architectural choices, trade-offs, and implementations for the GearSwap marketplace, specifically addressing core distributed system challenges.

---

## 2.1 The Concurrent Checkout Problem

> **Scenario**: Two buyers checkout the last item simultaneously.

### 1. Approaches
1.  **Pessimistic Locking**:
    - Lock the database row/document when a user starts checkout.
    - Prevents others from even reading/writing the stock until the transaction completes.
2.  **Optimistic Locking (Versioning)**:
    - Read stock with a version number (v1).
    - When updating, condition the write on `version == v1`.
    - If version changed (v2), the update fails and the operation is retried.
3.  **Atomic Database Operations (Compare-and-Swap)**:
    - Use database-native atomic operators to decrement stock *only if* it meets criteria.
    - MongoDB: `update({ _id: variantId, stock: { $gte: quantity } }, { $inc: { stock: -quantity } })`.

### 2. Trade-offs
*   **Pessimistic**: High Consistency ✅, High Complexity ❌, Poor User Experience (locking/waiting) ❌.
*   **Optimistic**: High Consistency ✅, Medium Complexity ⚠️, Good UX (fast reads, fail on write) ✅.
*   **Atomic**: High Consistency ✅, Low Complexity ✅, Best UX (instant feedback) ✅.

### 3. What Did You Implement?
**Approach**: **Read-Modify-Write (Vulnerable)**.

**Details**:
In `order.service.ts` / `product.service.ts`:
1.  `checkout()` reads the product variant to check `stock < quantity` (Read).
2.  If valid, it creates the `Order` document.
3.  Then it calls `updateVariantStock()` which performs a simple update (`variant.stock = newStock`).

**Why**: For this MVP, I prioritized minimizing complexity and leveraging Mongoose's abstraction. I acknowledged the race condition risk where two users could pass step 1 simultaneously before step 3 completes, resulting in overselling (negative stock potential if not strictly validated at DB level).

### 4. Flash Sale Strategy (10,000 users)
If scaling for a flash sale, I would:
1.  **Use Redis**: Move inventory counters to Redis for ultra-fast atomic decrements (`DECRBY`).
2.  **Message Queue**: Decouple checkout from order processing. User clicks "Buy" -> Request enters Queue -> Workers process queue sequentially/batched -> Result pushed to client via WebSocket.
3.  **Database Constraint**: Enforce `stock >= 0` constraint at the database schema level as a final safety net.

---

## 2.2 The Discount Stacking Dilemma

> **Scenario**: 20% OFF + ₹500 OFF on a ₹10,000 item.

### 1. Stacking Implementation
**Decision**: Discounts generally **should not stack** in a simple marketplace to protect seller margins, unless explicitly configured.
*   **Business Implication**: Stacking requires complex margin protection logic. Unintentional stacking (e.g., 50% off + 50% off) can lead to 100% loss.

### 2. Application Order (If Stacked)
Math matters:
*   **Option A (% then Fixed)**: `(10,000 * 0.80) - 500` = 8,000 - 500 = **₹7,500**.
*   **Option B (Fixed then %)**: `(10,000 - 500) * 0.80` = 9,500 * 0.80 = **₹7,600**.

**Recommendation**: Apply **Percentage First**, then Fixed. This maximizes the discount for the user (Option A), generally increasing conversion. However, sellers strictly prefer "Fixed First" if they want to preserve revenue.

### 3. What Did You Implement?
**Approach**: **Single Discount Only (Last-Write-Wins)**.

**Details**:
*   `cart.service.ts` logic allows only one `discountId` on the Cart model.
*   Calling `applyDiscount` overrides any previous discount.
*   **Configuration for Flexibility**: To support stacking, I would change `discountId` (single) to `appliedDiscounts` (array) and add a `stackable: boolean` flag to the `Discount` schema.

### 4. Handling Negative Prices
I implemented a floor function in `cart.service.ts`:
```typescript
const total = Math.max(0, subtotal - discountAmount);
```
This ensures that even if a discount (e.g., ₹500 OFF on a ₹300 item) exceeds the price, the total never drops below zero.

---

## 2.3 The Price Snapshot Problem

> **Scenario**: Added to cart at ₹50,000. Price checkout at ₹55,000.

### 1. Which Price to Pay?
The buyer should pay the **Current Price (₹55,000)**.
*   **Business**: Prices fluctuate based on supply/demand. Honoring old prices creates vulnerability to arbitrage (users holding items in cart indefinitely).
*   **Technical**: Storing price in cart requires invalidation logic (complex) whenever the catalog updates.

### 2. What Did You Implement?
**Approach**: **Dynamic Pricing (Fresh Fetch)**.

**Details**:
*   In `cart.service.ts` (`getCartWithPricing`), I iterate through cart items and fetch the *current* variant data (`price`) from the `products` collection fresh on every read.
*   The `Card` references only `productId` and `variantId`, not the price.
*   This ensures the checkout total always matches the live catalog price.

### 3. Communication
Currently, the update is silent (suboptimal). A better UX would be:
*   Compare 'last seen price' vs 'current price'.
*   If different, display a Toast/Alert: *"Items in your cart have changed price."*
*   Require user re-confirmation before valid checkout.

### 4. Decreased Price
Behavior is symmetric: user pays the lower current price. This is a "delightful surprise" for the user and requires no warning, though highlighting it ("Price dropped!") drives conversion.

---

## 2.4 Data Modeling Trade-off

> **Scenario**: Storing order history while products change.

### 1. Trade-offs
*   **References (Foreign Keys)**:
    *   *Storage*: Low.
    *   *Accuracy*: **Poor**. If product price changes to ₹55k, order history shows ₹55k for a past ₹50k purchase.
*   **Snapshots**:
    *   *Storage*: High (duplication).
    *   *Accuracy*: **Perfect**. Preserves order state exactly as it occurred.
*   **Hybrid**: Link + Snapshot.

### 2. What Did You Implement?
**Approach**: **Hybrid / Snapshotting**.

**Details**:
In `Order` schema:
```typescript
{
  productId: Ref('Product'), // Link for navigation
  productName: String,       // Snapshot
  price: Number,             // Snapshot (Price at purchase)
  variantSku: String         // Snapshot
}
```
**Why**: Accounting requires immutable history. An invoice generated today for a purchase last year must show the original price, not today's price.

### 3. Effects
*   **Storage**: Increased (duplicating strings/numbers for every order), but acceptable given storage costs.
*   **Query Complexity**: **Reduced**. We don't need to `$lookup` (populate) the `Products` collection just to render an Invoice or Order History list.
*   **Accuracy**: High. 100% faithful to the transaction moment.

---

## 2.5 Your Schema Justification

### MongoDB Schema Design

**Core Collections**: `Users`, `Products`, `Orders`, `Carts`, `Discounts`.

### 1. Indexing Strategy
I created specific compound indexes for query patterns:
*   `Order`: `{ buyerId: 1, createdAt: -1 }` -> Optimizes "My Orders" page (filtering by user, sorting by date).
*   `Product`: `{ name: 'text', description: 'text' }` -> Enables the search bar functionality.
*   `Product`: `{ sellerId: 1 }` -> Optimizes the Seller Dashboard "My Products" list.
*   `Discount`: `{ code: 1 }` (Unique) -> Fast lookup during checkout validation.

### 2. Denormalization
*   **Variants in Product**: Embeds variants array inside Product.
    *   *Why*: Variants (Size/Color) are never queried independently of the main product. This avoids finding a Product then strictly querying a separate Variants collection.
*   **Order Items**: Embeds full item array in Order.
    *   *Why*: Orders are read-heavy and write-once. Embedding avoids complex joins for the most common access pattern (viewing an order).

### 3. Slow Queries & Mitigation
*   **Slowing Down**: `GET_PRODUCTS` with multiple complex filters (Category + Price Range + Text Search) simultaneously. MongoDB might verify text matches then filter, which can be slow on millions of docs.
*   **At Scale**:
    1.  Offload text search to **Elasticsearch** (specialized search engine).
    2.  Use **Redis** to cache common product listing pages (e.g., "Trending Guitars").
    3.  Implement **Facet Search** caching strategy.
