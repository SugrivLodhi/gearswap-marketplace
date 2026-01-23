# Design Decisions

This document explains the architectural and technical decisions made during the development of the GearSwap multi-vendor marketplace.

## 1. Architecture

### Why GraphQL?

**Decision**: Use GraphQL instead of REST for the API layer.

**Rationale**:
- **Precise Data Fetching**: Clients can request exactly the data they need, reducing over-fetching and under-fetching
- **Type Safety**: GraphQL schema provides strong typing that integrates well with TypeScript on both backend and frontend
- **Single Endpoint**: Simplifies API management and reduces the number of round trips
- **Real-time Capabilities**: Built-in support for subscriptions (though not implemented in this MVP)
- **Developer Experience**: GraphQL Playground provides excellent API exploration and documentation

**Trade-offs**:
- ❌ More complex caching compared to REST
- ❌ Steeper learning curve for developers unfamiliar with GraphQL
- ❌ Potential for expensive queries if not properly limited
- ✅ Better suited for complex data relationships (products → variants → sellers)
- ✅ Reduces frontend-backend coordination overhead

### Module Boundaries

**Decision**: Organize backend code into domain-driven modules (auth, product, cart, order, discount).

**Rationale**:
- **Separation of Concerns**: Each module owns its data model, business logic, and resolvers
- **Scalability**: Modules can be extracted into microservices if needed
- **Testability**: Business logic is isolated and easy to unit test
- **Team Collaboration**: Different developers can work on different modules with minimal conflicts

**Structure**:
```
modules/
├── auth/          # User authentication & authorization
├── product/       # Product catalog & variants
├── cart/          # Shopping cart with pricing
├── order/         # Order lifecycle management
└── discount/      # Discount codes & validation
```

### App Router Structure (Next.js 14)

**Decision**: Use Next.js 14 App Router with route groups for role-based pages.

**Rationale**:
- **Server Components by Default**: Better performance with less JavaScript shipped to client
- **Route Groups**: Clean separation of public, buyer, and seller pages without affecting URLs
- **Layouts**: Shared layouts reduce code duplication
- **Type-Safe Routing**: Better TypeScript integration

**Structure**:
```
app/
├── (public)/      # Public pages (products, login, register)
├── (buyer)/       # Buyer-only pages (cart, checkout, orders)
└── (seller)/      # Seller-only pages (dashboard, products, discounts)
```

---

## 2. Data Modeling

### Product Variant Strategy

**Decision**: Store variants as subdocuments within the product document.

**Rationale**:
- **Atomic Operations**: Variants are always accessed with their parent product
- **Consistency**: No orphaned variants if product is deleted
- **Performance**: Single query to fetch product with all variants
- **Business Logic**: Variants don't exist independently of products

**Alternative Considered**: Separate `Variant` collection with foreign key to `Product`.
- ❌ Rejected because it requires joins and doesn't match the business domain
- ❌ Variants never exist without a product
- ✅ Subdocuments provide better data locality

**Schema**:
```typescript
{
  _id: ObjectId,
  name: string,
  variants: [
    {
      _id: ObjectId,
      sku: string,
      price: number,
      stock: number,
      attributes: { size: "M", color: "Blue" }
    }
  ]
}
```

### Cart vs Order Snapshot Decision

**Decision**: Cart stores references; Orders store complete snapshots.

**Rationale**:

**Cart** (References):
- Stores only `productId` and `variantId`
- Pricing is **always calculated dynamically**
- Ensures buyers see current prices and stock
- Prevents stale pricing data

**Order** (Snapshots):
- Stores complete item details (name, price, SKU)
- Captures pricing at time of purchase
- Historical accuracy for accounting and disputes
- Immutable record of what was purchased

**Why This Matters**:
- If a seller changes a product price, active carts reflect the new price
- Past orders show the price that was actually paid
- Discount codes are stored by code (string) in orders, not by reference

**Example**:
```typescript
// Cart Item (Reference)
{
  productId: "abc123",
  variantId: "xyz789",
  quantity: 2
  // Price fetched dynamically from Product
}

// Order Item (Snapshot)
{
  productId: "abc123",
  productName: "Gaming Mouse",
  variantId: "xyz789",
  variantSku: "GM-001-BLK",
  price: 49.99,        // Price at time of purchase
  quantity: 2,
  subtotal: 99.98
}
```

### Discount Rule Modeling

**Decision**: Use a flexible rule-based system with multiple validation criteria.

**Rationale**:
- **Expiry Date**: Time-limited promotions
- **Minimum Cart Value**: Encourage higher order values
- **Usage Limits**: Control discount budget
- **Product Targeting**: Seller-specific or product-specific discounts
- **Type (Percentage/Flat)**: Different discount strategies

**Validation Flow**:
1. Check if discount code exists
2. Verify discount is active
3. Check expiry date
4. Verify usage limit not exceeded
5. Validate minimum cart value
6. Calculate discount amount
7. Apply to cart

**Trade-offs**:
- ✅ Flexible enough for most promotion strategies
- ✅ Easy to extend with new rules
- ❌ No support for "buy X get Y" or tiered discounts (intentional simplification)
- ❌ No automatic discount application (user must enter code)

---

## 3. Security

### JWT Handling

**Decision**: Use JWT tokens stored in localStorage with Bearer authentication.

**Implementation**:
- Backend generates JWT on login/register
- Frontend stores token in localStorage
- Apollo Client injects token in Authorization header
- Backend verifies token and injects user into GraphQL context

**Security Considerations**:
- ✅ Stateless authentication (no session storage needed)
- ✅ Token includes user ID and role for authorization
- ❌ Vulnerable to XSS attacks (localStorage accessible to JavaScript)
- ❌ No refresh token mechanism (tokens expire after 7 days)

**Production Improvements**:
- Use httpOnly cookies instead of localStorage
- Implement refresh token rotation
- Add CSRF protection
- Implement rate limiting on auth endpoints

### Role-Based Access Control (RBAC)

**Decision**: Enforce authorization at the resolver level using guard functions.

**Implementation**:
```typescript
// Guard functions
requireAuth(context)    // Any authenticated user
requireBuyer(context)   // Buyer role only
requireSeller(context)  // Seller role only

// Usage in resolver
async addToCart(_, { input }, context) {
  const user = requireBuyer(context);  // Throws if not buyer
  return cartService.addToCart(user.userId, input);
}
```

**Why Resolver-Level**:
- ✅ Centralized authorization logic
- ✅ Clear error messages
- ✅ Easy to audit and test
- ❌ Requires discipline to apply guards consistently

**Alternative Considered**: Middleware-based authorization
- ❌ Rejected because GraphQL doesn't have a middleware chain like Express
- ❌ Would require custom directives or field-level authorization

### API Abuse Prevention

**Current Implementation**:
- Input validation on all mutations
- Stock validation prevents over-purchasing
- Discount usage limits prevent abuse

**Production Improvements**:
- Rate limiting (e.g., 100 requests/minute per IP)
- Query complexity analysis (prevent expensive nested queries)
- Pagination limits (max 100 items per page)
- CAPTCHA on registration/login
- Email verification for new accounts

---

## 4. Performance

### Pagination Strategy

**Decision**: Use cursor-based pagination instead of offset-based.

**Rationale**:
- **Consistency**: Results don't skip or duplicate when data changes
- **Performance**: Cursors use indexed fields (_id), avoiding slow OFFSET queries
- **Scalability**: Works well with large datasets

**Implementation**:
```graphql
products(pagination: { cursor: "abc123", limit: 20 }) {
  edges {
    node { ...product }
    cursor
  }
  pageInfo {
    hasNextPage
    endCursor
  }
}
```

**Trade-offs**:
- ✅ Better performance at scale
- ✅ Consistent results
- ❌ Can't jump to arbitrary page numbers
- ❌ More complex frontend logic

### GraphQL Query Shaping

**Decision**: Design queries to match UI needs exactly.

**Examples**:
- Product listing: Only fetch fields needed for cards (no full descriptions)
- Cart: Include calculated pricing in response (no separate query needed)
- Orders: Include item snapshots inline (no need to fetch products)

**Benefits**:
- Reduces payload size
- Minimizes database queries
- Improves perceived performance

### Indexing Decisions

**MongoDB Indexes Created**:

**Users**:
- `email` (unique) - Fast login lookups

**Products**:
- `sellerId` + `isDeleted` - Seller's product list
- `category` + `isDeleted` - Category filtering
- Text index on `name` + `description` - Search functionality

**Orders**:
- `buyerId` + `createdAt` - Buyer order history
- `items.sellerId` + `createdAt` - Seller order filtering

**Carts**:
- `buyerId` (unique) - One cart per buyer

**Discounts**:
- `code` (unique) - Fast discount lookup
- `sellerId` + `isActive` - Seller's discount list

**Why These Indexes**:
- Cover most common query patterns
- Balance between read performance and write overhead
- Compound indexes support multiple query types

---

## 5. Trade-offs

### What Was Intentionally Simplified

**No Payment Integration**:
- **Why**: Focus on system design, not payment gateway integration
- **Impact**: Order status transitions are manual
- **Production**: Integrate Stripe/PayPal with webhooks

**No Image Upload**:
- **Why**: Avoid file storage complexity
- **Impact**: Products use image URLs only
- **Production**: Use AWS S3 or Cloudinary with signed uploads

**No Real-time Notifications**:
- **Why**: Subscriptions add complexity
- **Impact**: Users must refresh to see updates
- **Production**: Implement GraphQL subscriptions or WebSockets

**No Email Verification**:
- **Why**: Simplify registration flow
- **Impact**: Anyone can create accounts
- **Production**: Send verification emails with tokens

**Basic Search**:
- **Why**: MongoDB text search is sufficient for MVP
- **Impact**: No fuzzy matching or advanced filters
- **Production**: Use Elasticsearch or Algolia

### What Would Be Refactored at Scale

**1. Separate Read/Write Models (CQRS)**:
- Current: Same models for reads and writes
- At Scale: Separate optimized read models (denormalized)
- Benefit: Better query performance, easier caching

**2. Event Sourcing for Orders**:
- Current: Direct state updates
- At Scale: Event log (OrderCreated, OrderPaid, OrderShipped)
- Benefit: Full audit trail, easier to replay/debug

**3. Microservices Architecture**:
- Current: Monolithic backend
- At Scale: Separate services (Auth, Catalog, Orders, Payments)
- Benefit: Independent scaling, team autonomy

**4. Caching Layer**:
- Current: No caching (except Apollo Client)
- At Scale: Redis for session data, product catalog
- Benefit: Reduced database load, faster responses

**5. Background Jobs**:
- Current: Synchronous operations
- At Scale: Queue system (Bull/BullMQ) for emails, notifications
- Benefit: Better user experience, fault tolerance

**6. Database Sharding**:
- Current: Single MongoDB instance
- At Scale: Shard by seller ID or geographic region
- Benefit: Horizontal scalability

**7. CDN for Static Assets**:
- Current: Next.js serves everything
- At Scale: CloudFront/Cloudflare for images, CSS, JS
- Benefit: Global performance, reduced server load

---

## Conclusion

This marketplace demonstrates production-ready patterns while acknowledging intentional simplifications. The architecture is designed to be:

- **Maintainable**: Clear module boundaries and separation of concerns
- **Testable**: Business logic isolated from framework code
- **Scalable**: Cursor-based pagination, proper indexing, stateless auth
- **Secure**: Role-based access control, input validation, JWT authentication

The trade-offs made prioritize **clarity and explainability** over feature completeness, making this codebase an excellent foundation for learning and extension.
