# GearSwap Marketplace

A production-ready multi-vendor marketplace built with modern technologies, demonstrating strong system design, backend modeling, and frontend architecture.

## 🎯 Project Overview

GearSwap is a simplified multi-vendor marketplace that allows:
- **Buyers** to browse products, add items to cart, apply discounts, and place orders
- **Sellers** to manage products, create discount codes, and track orders
- **Multi-vendor support** with proper isolation and role-based access control

This project prioritizes **clarity and explainability** over feature completeness, making it an excellent learning resource and foundation for extension.

---

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **API**: Apollo Server (GraphQL)
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Apollo Client + React Context
- **Forms**: React Hook Form + Zod

---

## 📁 Project Structure

```
gearswap-marketplace/
├── backend/
│   ├── src/
│   │   ├── config/           # Database & environment config
│   │   ├── modules/
│   │   │   ├── auth/         # User authentication & JWT
│   │   │   ├── product/      # Product catalog with variants
│   │   │   ├── cart/         # Shopping cart with pricing
│   │   │   ├── order/        # Order lifecycle management
│   │   │   └── discount/     # Discount codes & validation
│   │   ├── graphql/          # Schema & resolvers
│   │   ├── middleware/       # Auth guards
│   │   └── index.ts          # Server entry point
│   ├── tests/                # Unit tests
│   └── package.json
│
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (public)/         # Public pages
│   │   ├── (buyer)/          # Buyer dashboard
│   │   └── (seller)/         # Seller dashboard
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Apollo Client & Auth context
│   ├── graphql/              # GraphQL queries & mutations
│   └── package.json
│
├── DESIGN_DECISIONS.md       # Architecture & trade-offs
├── CODE_REVIEW.md            # Self-review & improvements
├── SEED_DATA.md              # Test data guide
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 5.0+ running locally or remotely

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (`.env`):
   ```env
   PORT=4000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/gearswap
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   Server will be available at: `http://localhost:4000/graphql`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

4. **Configure environment variables** (`.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   Application will be available at: `http://localhost:3000`

---

## 🧪 Running Tests

### Backend Tests

```bash
cd backend
npm test
```

**Test Coverage**:
- Cart pricing calculations
- Discount validation rules
- Order creation and stock deduction
- Status lifecycle transitions

**Run tests with coverage**:
```bash
npm test -- --coverage
```

---

## 📊 Database Setup

### MongoDB Connection

The application expects MongoDB to be running on `localhost:27017` by default.

**Using Docker**:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Using MongoDB Atlas** (cloud):
Update `MONGODB_URI` in `.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gearswap
```

### Seed Data

Follow the instructions in [SEED_DATA.md](./SEED_DATA.md) to populate the database with test data.

---

## 🔑 Authentication

### User Roles

- **BUYER**: Can browse products, manage cart, place orders
- **SELLER**: Can create products, manage discounts, view orders
-**INFO**: Add product by Seller ,add these domain only when adding image: 
           domains: ['example.com', 'via.placeholder.com','images.unsplash.com'],

### Sample Credentials (after seeding)

| Role   | Email                | Password   |
|--------|----------------------|------------|
| Buyer  | buyer@example.com    | buyer123   |
| Seller | seller1@example.com  | seller123  |

### JWT Flow

1. User registers or logs in
2. Backend generates JWT token
3. Frontend stores token in localStorage
4. Token is sent in `Authorization: Bearer <token>` header
5. Backend verifies token and injects user into GraphQL context

---

## 📖 API Documentation

### GraphQL Playground

Visit `http://localhost:4000/graphql` to explore the API interactively.

### Key Queries & Mutations

**Authentication**:
```graphql
mutation {
  register(input: { email: "user@example.com", password: "pass123", role: BUYER }) {
    token
    user { id email role }
  }
}

mutation {
  login(input: { email: "user@example.com", password: "pass123" }) {
    token
    user { id email role }
  }
}
```

**Products** (Public):
```graphql
query {
  products(filters: { search: "mouse", category: "Electronics" }, pagination: { limit: 20 }) {
    edges {
      node {
        id
        name
        description
        variants { id sku price stock }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

**Cart** (Buyer):
```graphql
mutation {
  addToCart(input: { productId: "123", variantId: "456", quantity: 2 }) {
    items { productName quantity price subtotal }
    subtotal
    discount
    total
  }
}

query {
  myCart {
    items { productName quantity price subtotal }
    subtotal
    discount
    total
  }
}
```

**Orders** (Buyer):
```graphql
mutation {
  checkout {
    id
    status
    items { productName price quantity }
    total
  }
}

query {
  myOrders {
    id
    status
    items { productName price quantity }
    total
    createdAt
  }
}
```

**Products** (Seller):
```graphql
mutation {
  createProduct(input: {
    name: "Gaming Mouse"
    description: "High-precision mouse"
    category: "Electronics"
    imageUrl: "https://example.com/image.jpg"
    variants: [
      { sku: "MOUSE-001", price: 49.99, stock: 100, attributes: [{ key: "color", value: "Black" }] }
    ]
  }) {
    id
    name
  }
}
```

**Discounts** (Seller):
```graphql
mutation {
  createDiscount(input: {
    code: "SAVE20"
    type: PERCENTAGE
    value: 20
    minimumCartValue: 50
    maxUses: 100
  }) {
    id
    code
  }
}
```

---

## 🎨 Frontend Features

### Public Pages
- **Homepage**: Product listing with search, filters, and pagination
- **Product Detail**: Variant selection and add to cart
- **Login/Register**: Authentication forms

### Buyer Dashboard
- **Cart**: View items, apply discounts, see pricing breakdown
- **Checkout**: Create order from cart
- **Orders**: View order history and status

### Seller Dashboard
- **Dashboard**: Sales overview and statistics
- **Products**: CRUD operations for products and variants
- **Orders**: View and update order status
- **Discounts**: Create and manage discount codes

---

## 🔒 Security Features

- **JWT Authentication**: Stateless token-based auth
- **Role-Based Access Control**: Enforced at resolver level
- **Input Validation**: Prevents invalid data
- **Password Hashing**: bcrypt with salt rounds
- **CORS Protection**: Configured origin whitelist

---

## 📈 Performance Optimizations

- **Cursor-Based Pagination**: Efficient for large datasets
- **MongoDB Indexes**: Optimized query performance
- **GraphQL Query Shaping**: Fetch only needed fields
- **Server Components**: Reduced client-side JavaScript (Next.js 14)

---

## 📚 Documentation

- **[DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)**: Architectural decisions, data modeling, trade-offs
- **[CODE_REVIEW.md](./CODE_REVIEW.md)**: Self-review, known limitations, production improvements
- **[SEED_DATA.md](./SEED_DATA.md)**: Step-by-step guide to populate test data

---

## 🧩 Key Design Patterns

### Backend

1. **Service Layer Pattern**: Business logic separated from resolvers
2. **Repository Pattern**: Data access abstracted in models
3. **Guard Pattern**: Reusable authorization checks
4. **Snapshot Pattern**: Orders store complete item details

### Frontend

1. **Compound Components**: Reusable UI building blocks
2. **Custom Hooks**: Shared logic (useAuth)
3. **Apollo Client**: Centralized data fetching and caching
4. **Route Groups**: Clean page organization

---

## 🚧 Known Limitations

- No payment gateway integration (order status is manual)
- No image upload (URLs only)
- No real-time notifications
- No email verification
- Basic search (no fuzzy matching)

See [CODE_REVIEW.md](./CODE_REVIEW.md) for detailed limitations and production improvements.

---

## 🛠️ Development Workflow

### Backend Development

```bash
cd backend
npm run seed # Add some dummy data in db and see intail ui
npm run dev      # Start dev server with hot reload
npm test         # Run tests
npm run build    # Build for production
npm start        # Run production build
```

### Frontend Development

```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
```

---

## 📦 Deployment

### Backend Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Start the server: `npm start`

**Recommended Platforms**: Heroku, Railway, Render, AWS EC2

### Frontend Deployment

1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or any Node.js hosting

**Recommended Platform**: Vercel (optimized for Next.js)

### Database

**Recommended**: MongoDB Atlas (managed cloud database)

---

## 🤝 Contributing

This is a demonstration project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

## 📄 License

MIT License - feel free to use this project for learning or as a foundation for your own marketplace.

---

## 🙏 Acknowledgments

Built with modern best practices to demonstrate:
- Clean architecture and separation of concerns
- Thoughtful data modeling
- Production-ready patterns
- Clear documentation and explainability

**Focus**: Learning, clarity, and strong fundamentals over feature completeness.

---

## 📞 Support

For questions or issues:
1. Check [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) for architectural explanations
2. Review [CODE_REVIEW.md](./CODE_REVIEW.md) for known limitations
3. Follow [SEED_DATA.md](./SEED_DATA.md) for setup guidance

---

**Happy coding! 🚀**
