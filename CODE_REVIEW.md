# Code Review Feedback

## Snippet A: Checkout Resolver
```typescript
const checkout = async (_, { input }, context) => {
  const cart = await Cart.findOne({ userId: context.user.id });
  const order = new Order({
    userId: context.user.id,
    items: cart.items,
    total: cart.total,
    status: 'CONFIRMED'
  });
  
  for (const item of cart.items) {
    await Product.updateOne(
      { _id: item.productId, 'variants._id': item.variantId },
      { $inc: { 'variants.$.stock': -item.quantity } }
    );
  }
  
  await order.save();
  await Cart.deleteOne({ userId: context.user.id });
  
  return order;
};
```

### Issues Identified

1.  **Critical Race Condition & Inventory Integrity**: The code uses `$inc` to decrement stock without checking if sufficient stock exists. This allows stock to go negative (`-item.quantity`).
    *   **Fix**: Add a condition to the update query: `{ 'variants.stock': { $gte: item.quantity } }` to ensure the update only happens if there is enough stock.

2.  **Lack of Atomicity (No Transactions)**: The operations (inventory updates, order creation, cart deletion) are performed sequentially without a transaction. If the server crashes or an error occurs after stock deduction but before order creation, the customer loses stock without an order (inconsistent state).
    *   **Fix**: Wrap all operations in a MongoDB Transaction (`session.withTransaction(...)`) so they either all succeed or all fail.

3.  **Missing Error Handling**: There is no `try/catch` block. If `Cart.findOne` returns null (e.g., race condition where cart was just cleared) or `item.projectId` is invalid, the resolver will crash or throw an unhandled promise rejection.
    *   **Fix**: Implement robust error handling. Check if `cart` exists before proceeding.

4.  **Decimal Precision Issues**: Relying on `cart.total` (likely floating point in JS) can lead to rounding errors (e.g., `0.1 + 0.2`).
    *   **Fix**: Recalculate the total on the backend from the source prices in the database, or store monetary values as integers (cents) to avoid floating-point drift.

### Recommended Fix

```typescript
const checkout = async (_, { input }, context) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const cart = await Cart.findOne({ userId: context.user.id }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // 1. Bulk update inventory with safety checks
    const bulkOps = cart.items.map(item => ({
      updateOne: {
        filter: { 
          _id: item.productId, 
          "variants._id": item.variantId,
          "variants.stock": { $gte: item.quantity } // Prevent negative stock
        },
        update: { $inc: { "variants.$.stock": -item.quantity } }
      }
    }));

    const result = await Product.bulkWrite(bulkOps, { session });
    
    // Check if all items were updated (if matchedCount < items.length, some were out of stock)
    if (result.modifiedCount !== cart.items.length) {
      throw new Error("One or more items are out of stock");
    }

    // 2. Create Order
    const order = new Order({
      userId: context.user.id,
      items: cart.items,
      total: cart.total, // Consider recalculating this for security
      status: 'CONFIRMED'
    });
    await order.save({ session });

    // 3. Clear Cart
    await Cart.deleteOne({ userId: context.user.id }).session(session);

    await session.commitTransaction();
    return order;
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

---

## Snippet B: Product Listing Query

```typescript
const products = async (_, { category, minPrice, maxPrice, search, page }) => {
  let query = {};
  
  if (category) query.category = category;
  if (minPrice) query.price = { $gte: minPrice };
  if (maxPrice) query.price = { ...query.price, $lte: maxPrice };
  if (search) query.title = { $regex: search };
  
  const products = await Product.find(query)
    .skip(page * 20)
    .limit(20);
    
  return products;
};
```

### Issues Identified

1.  **NoSQL Injection Vulnerability**: The code directly assigns input arguments to the query object (`query.category = category`). If a malicious user passes an object like `{ "$ne": null }` instead of a string for `category`, they could dump the entire database.
    *   **Fix**: Sanitize inputs or strictly type-check them (e.g., ensure `category` is a String) before adding to the query.

2.  **Performance (Regex Full Scan)**: Using `$regex` on the `title` field without a prefix anchor (start of string) triggers a full collection scan (`COLLSCAN`). This will be extremely slow as the dataset grows.
    *   **Fix**: Use MongoDB Text Indexes (`$text: { $search: search }`) or Atlas Search for performant, scalable full-text search.

3.  **Pagination Logic Flaws**: 
    *   **Missing Sort**: There is no `.sort()` applied. MongoDB does not guarantee order without it, causing "page drift" (items appearing on multiple pages or being skipped).
    *   **Skip/Limit Performance**: `skip()` allows for poor performance at high offsets.
    *   **Input Validation**: If `page` is undefined or negative, `page * 20` results in `NaN` or invalid skip values.

4.  **Inefficient Object Spreading**: The line `query.price = { ...query.price, $lte: maxPrice }` works but is slightly sloppy. If `minPrice` is not set, we spread `undefined`, which is safe but purely accidental.
    *   **Fix**: Build the range query more explicitly to be readable and type-safe.

### Recommended Fix

```typescript
const products = async (_, { category, minPrice, maxPrice, search, page = 0 }) => {
  const query: any = {};
  
  // 1. Validate inputs to prevent Injection
  if (category && typeof category === 'string') {
    query.category = category;
  }

  // 2. Build Range Query properly
  if (minPrice || maxPrice) {
    query.price = {};
    if (Number.isFinite(minPrice)) query.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) query.price.$lte = maxPrice;
  }

  // 3. Use Text Search (requires invalid index creation) instead of Regex
  if (search && typeof search === 'string') {
    // Assuming a text index exists on 'title'
    query.$text = { $search: search }; 
  }

  const limit = 20;
  // Ensure page is a valid number
  const skip = Math.max(0, page) * limit;

  // 4. Always Sort for consistent pagination
  const products = await Product.find(query)
    .sort({ createdAt: -1 }) // Deterministic sort
    .skip(skip)
    .limit(limit);
    
  return products;
};
```
