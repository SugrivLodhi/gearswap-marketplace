# GearSwap Musical Instrument Marketplace - Quick Start Guide

## 🎵 Database Seeder

The seeder populates your database with realistic musical instrument data for testing.

### What Gets Created

**Users (7 total)**:
- 3 Buyers (musicians looking to purchase instruments)
- 4 Sellers (music stores selling instruments)

**Products (20 musical instruments)**:
- Electric Guitars: Fender Stratocaster, Gibson Les Paul, Ibanez RG550
- Acoustic Guitars: Taylor 214ce
- Bass Guitars: Fender Precision Bass, Music Man StingRay
- Keyboards: Roland Fantom-8, Korg Minilogue XD, Yamaha P-125, Moog Subsequent 37
- Drums: Pearl Export Kit, Roland V-Drums, Zildjian Cymbals, DW Snare
- Wind Instruments: Yamaha Alto Sax, Yamaha Venova
- Brass: Bach Stradivarius Trumpet
- Strings: Eastman Violin
- Audio: Shure SM58, Focusrite Scarlett 2i2
- Amps: Boss Katana-50

**Discount Codes (5)**:
- MUSIC20: 20% off orders over $500
- NEWPLAYER: $50 off orders over $200
- DRUMMER15: 15% off orders over $300
- ORCHESTRA100: $100 off orders over $1000
- FREESHIP: $25 off orders over $100

---

## 🚀 Running the Seeder

### Prerequisites

1. **MongoDB must be running**:
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or start your local MongoDB service
   ```

2. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

### Run the Seeder

```bash
cd backend
npm run seed
```

This will:
1. Clear existing data
2. Create users, products, and discounts
3. Display a summary with login credentials

---

## 🔑 Test Credentials

All passwords are: `password123`

### Buyer Accounts
- `john.musician@example.com`
- `sarah.guitarist@example.com`
- `mike.drummer@example.com`

### Seller Accounts
- `guitar.heaven@gearswap.com` (Guitars & Basses)
- `keys.and.synths@gearswap.com` (Keyboards & Audio)
- `drum.world@gearswap.com` (Drums & Percussion)
- `brass.and.strings@gearswap.com` (Orchestral Instruments)

---

## 🧪 Testing End-to-End Functionality

### 1. Start the Backend

```bash
cd backend
npm run dev
```

Server runs at: `http://localhost:4000/graphql`

### 2. Test as a Buyer

**Login**:
```graphql
mutation {
  login(input: {
    email: "john.musician@example.com"
    password: "password123"
  }) {
    token
    user { id email role }
  }
}
```

**Browse Products**:
```graphql
query {
  products(filters: { category: "Electric Guitars" }) {
    edges {
      node {
        id
        name
        description
        variants {
          id
          sku
          price
          stock
          attributes { key value }
        }
      }
    }
  }
}
```

**Add to Cart** (use token in Authorization header):
```graphql
mutation {
  addToCart(input: {
    productId: "<product_id>"
    variantId: "<variant_id>"
    quantity: 1
  }) {
    items {
      productName
      variantSku
      price
      quantity
      subtotal
    }
    subtotal
    total
  }
}
```

**Apply Discount**:
```graphql
mutation {
  applyDiscount(code: "MUSIC20") {
    items { productName subtotal }
    subtotal
    discount
    total
  }
}
```

**Checkout**:
```graphql
mutation {
  checkout {
    id
    status
    items {
      productName
      price
      quantity
    }
    subtotal
    discount
    total
  }
}
```

**View Orders**:
```graphql
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

### 3. Test as a Seller

**Login**:
```graphql
mutation {
  login(input: {
    email: "guitar.heaven@gearswap.com"
    password: "password123"
  }) {
    token
    user { id email role }
  }
}
```

**View Seller Orders**:
```graphql
query {
  sellerOrders {
    id
    status
    items {
      productName
      sellerId
      price
      quantity
    }
    total
    createdAt
  }
}
```

**Update Order Status**:
```graphql
mutation {
  updateOrderStatus(
    orderId: "<order_id>"
    status: PAID
  ) {
    id
    status
  }
}
```

**Create New Product**:
```graphql
mutation {
  createProduct(input: {
    name: "Custom Guitar Pedal"
    description: "Boutique overdrive pedal"
    category: "Audio Equipment"
    imageUrl: "https://example.com/pedal.jpg"
    variants: [{
      sku: "PEDAL-001"
      price: 199.99
      stock: 15
      attributes: [{ key: "color", value: "Blue" }]
    }]
  }) {
    id
    name
  }
}
```

**View My Discounts**:
```graphql
query {
  myDiscounts {
    id
    code
    type
    value
    minimumCartValue
    currentUses
    maxUses
  }
}
```

---

## 🎯 Sample Shopping Flow

1. **Login as buyer**: `john.musician@example.com`
2. **Browse guitars**: Search for "Stratocaster"
3. **Add to cart**: Fender Stratocaster (Sunburst) x1
4. **Add keyboard**: Yamaha P-125 (Black) x1
5. **Apply discount**: Use code `MUSIC20` (20% off)
6. **Checkout**: Create order
7. **Login as seller**: `guitar.heaven@gearswap.com`
8. **View orders**: See the Stratocaster order
9. **Update status**: PENDING → PAID → SHIPPED → COMPLETED

---

## 📊 Product Inventory

| Category | Products | Price Range |
|----------|----------|-------------|
| Electric Guitars | 4 | $1,299 - $2,599 |
| Acoustic Guitars | 1 | $1,099 |
| Bass Guitars | 2 | $1,699 - $2,199 |
| Keyboards | 4 | $649 - $3,999 |
| Drums | 4 | $549 - $1,799 |
| Wind/Brass | 3 | $89 - $2,899 |
| Strings | 1 | $549 - $599 |
| Audio/Amps | 3 | $99 - $259 |

---

## 🔄 Re-seeding

To reset and re-seed the database:

```bash
npm run seed
```

This will clear all existing data and create fresh test data.

---

## 🎸 Musical Instrument Categories

The marketplace includes instruments across all major categories:

- **Guitars**: Electric, Acoustic, Bass
- **Keyboards**: Digital Pianos, Synthesizers, Workstations
- **Drums**: Acoustic Kits, Electronic Kits, Cymbals, Snares
- **Orchestral**: Saxophones, Trumpets, Violins
- **Audio**: Microphones, Interfaces, Amplifiers

Each product has multiple variants (colors, sizes, configurations) with individual SKUs and stock levels.

---

## ✅ Verification Checklist

After seeding, verify:

- [ ] All 7 users can login
- [ ] 20 products are visible
- [ ] Products have correct variants and pricing
- [ ] Buyers can add items to cart
- [ ] Discount codes work correctly
- [ ] Checkout creates orders
- [ ] Stock is deducted after purchase
- [ ] Sellers can view their orders
- [ ] Order status can be updated

---

**Enjoy testing the GearSwap Musical Instrument Marketplace! 🎵**
