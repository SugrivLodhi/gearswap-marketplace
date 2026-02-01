# GearSwap Musical Instrument Marketplace - Quick Start Guide

## 🎵 Database Seeder

The seeder populates your database with realistic musical instrument data for testing, now with **HSN codes and GST rates** for Indian tax compliance.

### What Gets Created

**Users (6 total)**:
- 2 Buyers (musicians looking to purchase instruments)
- 4 Sellers (music stores selling instruments)

**Products (16 musical instruments with HSN codes and GST)**:
- Electric Guitars: Fender Stratocaster, Ibanez Gio
- Acoustic Guitars: Yamaha F310, Taylor 214ce
- Bass Guitars: Fender Precision Bass, Ibanez SR300E
- Keyboards: Yamaha PSR-E473, Korg Kronos 2
- Drums: Mapex Tornado Kit, Roland TD-07KV
- Wind Instruments: Yamaha Alto Sax, Hohner Harmonica
- Audio Equipment: Shure SM58, Focusrite Scarlett 2i2
- Amplifiers: Marshall MG15G, Blackstar Fly 3

**Discount Codes (3)**:
- DIWALI2026: 20% off orders over ₹50,000
- NEWYEAR: ₹5,000 off orders over ₹40,000
- STUDENT10: 10% off orders over ₹20,000

---

## 🏷️ HSN Codes & GST Rates

All products include HSN codes and GST rates for tax compliance:

| Category | HSN Code | GST Rate | Products |
|----------|----------|----------|----------|
| String Instruments | 92071000 | 18% | Guitars, Bass |
| Keyboard Instruments | 92079000 | 18% | Keyboards, Synthesizers |
| Percussion Instruments | 92069000 | 18% | Drums |
| Brass Wind Instruments | 92051000 | 18% | Saxophones |
| Other Wind Instruments | 92059000 | 12% | Harmonicas |
| Microphones | 85181000 | 18% | Shure SM58 |
| Audio Amplifiers | 85182200 | 18% | Marshall, Blackstar |
| Audio Interfaces | 85198990 | 18% | Focusrite Scarlett |

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
2. Create users, products (with HSN codes), and discounts
3. Display a summary with login credentials

---

## 🔑 Test Credentials

All passwords are: `password123`

### Buyer Accounts
- `rahul.musician@example.com`
- `priya.guitarist@example.com`

### Seller Accounts
- `guitar.heaven@gearswap.com` (Guitars & Basses)
- `keys.and.synths@gearswap.com` (Keyboards)
- `drum.world@gearswap.com` (Drums & Percussion)
- `pro.audio@gearswap.com` (Audio Equipment)

---

## 🧪 Testing GST Calculation

### 1. Start the Backend

```bash
cd backend
npm run dev
```

Server runs at: `http://localhost:4000/graphql`

### 2. Test Checkout with GST

**Login as buyer**:
```graphql
mutation {
  login(input: {
    email: "rahul.musician@example.com"
    password: "password123"
  }) {
    token
    user { id email role }
  }
}
```

**Add product to cart**:
```graphql
mutation {
  addToCart(input: {
    productId: "<product_id>"
    variantId: "<variant_id>"
    quantity: 1
  }) {
    items {
      productName
      price
      quantity
    }
  }
}
```

**Checkout and see GST breakdown**:
```graphql
mutation {
  checkout {
    id
    items {
      productName
      hsnCode
      gstRate
      price
      quantity
      taxableAmount
      gstAmount
      totalAmount
    }
    taxableSubtotal
    discount
    totalGst
    grandTotal
    status
  }
}
```

### 3. Example GST Calculation

**Product**: Yamaha F310 Acoustic Guitar
- Base Price: ₹10,500 (GST-exclusive)
- HSN Code: 92071000
- GST Rate: 18%
- Quantity: 1

**Calculation**:
```
Taxable Amount = ₹10,500
GST Amount = 10,500 × 18 / 100 = ₹1,890
Total Amount = 10,500 + 1,890 = ₹12,390
```

**Order Totals**:
```
Taxable Subtotal: ₹10,500
Total GST: ₹1,890
Grand Total: ₹12,390
```

---

## 💳 Payment Integration (Mock Razorpay)

The system includes mock Razorpay integration for testing:

**Initiate Payment**:
```typescript
const payment = await paymentIntegrationService.initiatePayment(orderId, buyerId);
// Returns: { razorpayOrderId, amount, currency, orderDetails }
```

**Verify Payment**:
```typescript
await paymentIntegrationService.verifyAndCompletePayment(
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
);
// Updates order status to PAID
```

---

## 📊 Sample Order with GST

```json
{
  "id": "507f1f77bcf86cd799439011",
  "items": [
    {
      "productName": "Yamaha F310 Acoustic Guitar",
      "hsnCode": "92071000",
      "gstRate": 18,
      "sgstRate": 9,
      "cgstRate": 9,
      "igstRate": 0,
      "price": 10500,
      "quantity": 1,
      "taxableAmount": 10500,
      "gstAmount": 1890,
      "sgstAmount": 945,
      "cgstAmount": 945,
      "igstAmount": 0,
      "totalAmount": 12390
    }
  ],
  "taxableSubtotal": 10500,
  "discount": 0,
  "totalGst": 1890,
  "totalSgst": 945,
  "totalCgst": 945,
  "totalIgst": 0,
  "grandTotal": 12390,
  "status": "PENDING"
}
```

---

## 📋 Product Inventory with HSN Codes

| Product | HSN Code | GST | Base Price |
|---------|----------|-----|------------|
| Fender Stratocaster | 92071000 | 18% | ₹1,75,000 |
| Ibanez Gio GRX70QA | 92071000 | 18% | ₹18,500 |
| Yamaha F310 | 92071000 | 18% | ₹10,500 |
| Taylor 214ce-K DLX | 92071000 | 18% | ₹1,45,000 |
| Fender P-Bass | 92071000 | 18% | ₹78,000 |
| Ibanez SR300E | 92071000 | 18% | ₹32,000 |
| Yamaha PSR-E473 | 92079000 | 18% | ₹24,500 |
| Korg Kronos 2 | 92079000 | 18% | ₹3,20,000 |
| Mapex Tornado Kit | 92069000 | 18% | ₹35,000 |
| Roland TD-07KV | 92069000 | 18% | ₹89,000 |
| Yamaha YAS-280 | 92051000 | 18% | ₹98,000 |
| Hohner Harmonica | 92059000 | 12% | ₹1,200 |
| Shure SM58 | 85181000 | 18% | ₹9,500 |
| Focusrite Scarlett | 85198990 | 18% | ₹18,500 |
| Marshall MG15G | 85182200 | 18% | ₹12,500 |
| Blackstar Fly 3 | 85182200 | 18% | ₹6,500 |

---

## 📖 Additional Documentation

- **GST Flow Guide**: See `backend/GST_FLOW.md` for complete GST documentation
- **Implementation Plan**: See brain artifacts for technical details
- **Walkthrough**: See brain artifacts for implementation summary

---

## 🔄 Re-seeding

To reset and re-seed the database:

```bash
cd backend
npm run seed
```

This will clear all existing data and create fresh test data with HSN codes and GST rates.

---

## ✅ Verification Checklist

After seeding, verify:

- [x] All 6 users can login
- [x] 16 products are visible with HSN codes and GST rates
- [x] Products have correct variants and pricing
- [x] Buyers can add items to cart
- [x] Discount codes work correctly
- [x] Checkout creates orders with GST breakdown
- [x] Order items contain snapshotted HSN code and GST rate
- [x] Order totals include taxableSubtotal, totalGst, grandTotal
- [x] Stock is deducted after purchase
- [x] Sellers can view their orders

---

## 🎯 Key Features

✅ **HSN-based GST calculation** - Legally compliant with Indian GST law  
✅ **Per-item GST breakdown** - Supports mixed GST rates in single order  
✅ **Tax data snapshotting** - Historical accuracy for audits  
✅ **Invoice-ready data** - All fields required for GST invoices  
✅ **Mock payment integration** - Razorpay-compatible structure  
✅ **Discount before GST** - Compliant with GST regulations

---

**Enjoy testing the GearSwap Musical Instrument Marketplace with GST! 🎵**
