# Code Review

This is a self-review of the GearSwap marketplace codebase, written as if reviewing my own pull request.

## What I'm Proud Of

### 1. Clean Domain Modeling

The separation of business logic into services is excellent:

```typescript
// Business logic lives in services, not resolvers
class CartService {
  async getCartWithPricing(buyerId: string): Promise<CartWithPricing> {
    // Complex pricing calculation logic here
    // Resolvers just call this method
  }
}
```

**Why this matters**:
- Easy to unit test without GraphQL overhead
- Business logic can be reused (e.g., in background jobs)
- Clear separation of concerns

### 2. Pricing Always Derived, Never Stored

The cart pricing calculation is done on every request:

```typescript
// Cart stores references
{ productId, variantId, quantity }

// Pricing calculated dynamically
const price = await getVariantPrice(productId, variantId);
const subtotal = price * quantity;
```

**Why this matters**:
- Buyers always see current prices
- No stale data issues
- Prevents pricing bugs from cached values

### 3. Comprehensive Discount Validation

The discount validation logic handles multiple edge cases:

```typescript
async validateDiscount(code: string, cartValue: number) {
  // Check: exists, active, not expired, usage limit, minimum value
  // All validation in one place
}
```

**Why this matters**:
- Prevents discount abuse
- Clear error messages for users
- Easy to add new validation rules

### 4. Order Snapshots for Historical Accuracy

Orders store complete item details, not just references:

```typescript
// Order item includes everything needed
{
  productName: "Gaming Mouse",  // Name at time of purchase
  price: 49.99,                 // Price at time of purchase
  variantSku: "GM-001-BLK"      // SKU at time of purchase
}
```

**Why this matters**:
- Accurate historical records
- Works even if products are deleted
- Accounting and dispute resolution

### 5. Role-Based Authorization Guards

Clean, reusable authorization logic:

```typescript
// Guard functions are composable
const user = requireBuyer(context);  // Throws if not buyer
const user = requireSeller(context); // Throws if not seller
const user = requireAuth(context);   // Throws if not authenticated
```

**Why this matters**:
- Consistent error messages
- Easy to audit authorization
- Prevents accidental security holes

---

## What Feels Rushed

### 1. Frontend State Management

**Issue**: No global state management library (Redux, Zustand).

**Current Approach**: Apollo Client cache + React Context for auth.

**Why it's rushed**:
- Cart count badge requires separate query
- No optimistic updates
- Refetching entire queries on mutations

**Better Approach**:
```typescript
// Should use Apollo cache updates
const [addToCart] = useMutation(ADD_TO_CART, {
  update(cache, { data }) {
    // Update cache directly instead of refetchQueries
    cache.modify({
      fields: {
        myCart() {
          return data.addToCart;
        }
      }
    });
  }
});
```

### 2. Error Handling

**Issue**: Generic error messages, no error codes.

**Current**:
```typescript
throw new Error('Invalid email or password');
```

**Better**:
```typescript
class AuthenticationError extends Error {
  code = 'AUTH_INVALID_CREDENTIALS';
  statusCode = 401;
}

throw new AuthenticationError('Invalid email or password');
```

**Why it matters**:
- Frontend can handle errors differently based on code
- Better logging and monitoring
- Easier to internationalize error messages

### 3. Input Validation

**Issue**: Validation is scattered between resolvers and services.

**Current**:
```typescript
// Some validation in resolver
if (!input.email) throw new Error('Email required');

// Some validation in service
if (password.length < 6) throw new Error('Password too short');
```

**Better**: Use a validation library (Joi, Yup, Zod) at the resolver level:
```typescript
const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  // ...
});

// Validate before calling service
const validated = createProductSchema.parse(input);
```

### 4. Loading and Error States

**Issue**: Minimal loading states in frontend.

**Current**:
```typescript
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
```

**Better**: Skeleton screens, error boundaries, retry logic:
```typescript
if (loading) return <ProductCardSkeleton count={12} />;
if (error) return <ErrorBoundary error={error} onRetry={refetch} />;
```

---

## Known Limitations

### 1. No N+1 Query Prevention

**Issue**: Fetching seller info for each product in a list.

**Current**:
```typescript
// Each product resolver fetches seller separately
Product: {
  seller: (parent) => User.findById(parent.sellerId)
}
```

**Impact**: 100 products = 100 database queries for sellers.

**Solution**: Implement DataLoader:
```typescript
const sellerLoader = new DataLoader(async (sellerIds) => {
  const sellers = await User.find({ _id: { $in: sellerIds } });
  return sellerIds.map(id => sellers.find(s => s._id.equals(id)));
});
```

### 2. No Transaction Support

**Issue**: Checkout process has multiple database operations that could fail partway through.

**Current**:
```typescript
// If stock deduction fails, order is already created
await Order.create(orderData);
await updateStock(productId, -quantity);  // Could fail
await clearCart(buyerId);
```

**Solution**: Use MongoDB transactions:
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await Order.create([orderData], { session });
  await updateStock(productId, -quantity, { session });
  await clearCart(buyerId, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### 3. No Rate Limiting

**Issue**: API is vulnerable to abuse (brute force, DoS).

**Impact**: Attackers could:
- Brute force passwords
- Exhaust discount codes
- Overload the server

**Solution**: Implement rate limiting:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/graphql', limiter);
```

### 4. No Pagination on Seller Orders

**Issue**: Seller with 10,000 orders loads all at once.

**Current**:
```typescript
sellerOrders: () => Order.find({ 'items.sellerId': sellerId })
```

**Solution**: Add pagination to seller orders query.

### 5. Stock Deduction Race Condition

**Issue**: Two buyers could purchase the last item simultaneously.

**Scenario**:
1. Buyer A checks stock: 1 available ✅
2. Buyer B checks stock: 1 available ✅
3. Buyer A completes checkout: stock = 0
4. Buyer B completes checkout: stock = -1 ❌

**Solution**: Use atomic operations:
```typescript
const result = await Product.updateOne(
  {
    _id: productId,
    'variants._id': variantId,
    'variants.stock': { $gte: quantity }  // Only update if enough stock
  },
  {
    $inc: { 'variants.$.stock': -quantity }
  }
);

if (result.modifiedCount === 0) {
  throw new Error('Insufficient stock');
}
```

---

## Technical Debt

### 1. No Database Migrations

**Issue**: Schema changes require manual updates.

**Impact**: Difficult to deploy changes across environments.

**Solution**: Use a migration tool (migrate-mongo):
```javascript
// migrations/001-add-product-category-index.js
module.exports = {
  async up(db) {
    await db.collection('products').createIndex({ category: 1 });
  },
  async down(db) {
    await db.collection('products').dropIndex('category_1');
  }
};
```

### 2. Hardcoded Configuration

**Issue**: Some values are hardcoded (pagination limits, token expiry).

**Current**:
```typescript
const limit = 20;  // Hardcoded
const expiresIn = '7d';  // Hardcoded
```

**Better**: Move to configuration:
```typescript
const config = {
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  auth: {
    tokenExpiry: '7d',
    bcryptRounds: 10
  }
};
```

### 3. No Logging Strategy

**Issue**: Only console.log statements, no structured logging.

**Impact**: Difficult to debug production issues.

**Solution**: Use a logging library (Winston, Pino):
```typescript
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date()
});
```

### 4. No Monitoring/Observability

**Issue**: No metrics, no error tracking.

**Impact**: Can't detect issues in production.

**Solution**: Add Sentry for error tracking, Prometheus for metrics.

---

## What I'd Change in Production

### 1. Authentication

**Current**: JWT in localStorage
**Production**: httpOnly cookies + refresh tokens

**Why**:
- Prevents XSS attacks
- Automatic token rotation
- Better security posture

### 2. File Uploads

**Current**: Image URLs only
**Production**: Direct upload to S3 with signed URLs

**Implementation**:
```typescript
// Generate presigned URL
const url = await s3.getSignedUrlPromise('putObject', {
  Bucket: 'gearswap-images',
  Key: `products/${uuid()}.jpg`,
  Expires: 300
});

// Frontend uploads directly to S3
await fetch(url, { method: 'PUT', body: imageFile });
```

### 3. Search

**Current**: MongoDB text search
**Production**: Elasticsearch or Algolia

**Why**:
- Fuzzy matching ("mous" finds "mouse")
- Faceted search (filters)
- Better relevance ranking
- Typo tolerance

### 4. Caching

**Current**: No server-side caching
**Production**: Redis for frequently accessed data

**What to cache**:
- Product catalog (5 min TTL)
- User sessions
- Discount codes
- Seller statistics

### 5. Background Jobs

**Current**: Everything is synchronous
**Production**: Queue system for async tasks

**What to queue**:
- Email notifications (order confirmation)
- Analytics events
- Image processing
- Report generation

### 6. Testing

**Current**: Unit tests for services only
**Production**: Full test pyramid

**Add**:
- Integration tests (API endpoints)
- E2E tests (critical user flows)
- Load tests (performance benchmarks)
- Contract tests (frontend-backend)

---

## Conclusion

This codebase demonstrates **strong fundamentals** with clear room for improvement. The architecture is sound, the domain modeling is thoughtful, and the code is readable.

**Strengths**:
- ✅ Clean separation of concerns
- ✅ Testable business logic
- ✅ Proper authorization
- ✅ Good data modeling

**Areas for Improvement**:
- ⚠️ Error handling and validation
- ⚠️ Performance optimizations (DataLoader, caching)
- ⚠️ Production readiness (transactions, rate limiting)
- ⚠️ Observability (logging, monitoring)

**Overall Assessment**: This is a **solid foundation** that clearly communicates design decisions and trade-offs. With the improvements outlined above, it would be production-ready for a moderate-scale marketplace.
