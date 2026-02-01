# GST Flow Documentation

Complete guide to HSN-based GST calculation in the GearSwap marketplace.

## Overview

The system implements legally compliant, audit-safe GST calculation following Indian GST law:
- **HSN codes** identify product categories for tax purposes
- **GST rates** are derived from HSN codes (not product names)
- **Per-item calculation** supports mixed-rate orders
- **Snapshotting** ensures historical accuracy for audits

---

## 1. Product Setup

### Adding HSN Code and GST Rate

When creating a product, you must specify:

```typescript
{
  name: "Yamaha F310 Acoustic Guitar",
  hsnCode: "92071000",  // 8-digit HSN code for string instruments
  gstRate: 18,          // 18% GST rate
  // ... other fields
}
```

### Common HSN Codes for Musical Instruments

| Category | HSN Code | GST Rate | Examples |
|----------|----------|----------|----------|
| String Instruments | 92071000 | 18% | Guitars, Violins, Cellos |
| Keyboard Instruments | 92079000 | 18% | Pianos, Keyboards, Synthesizers |
| Percussion Instruments | 92069000 | 18% | Drums, Cymbals, Percussion |
| Brass Wind Instruments | 92051000 | 18% | Trumpets, Saxophones |
| Other Wind Instruments | 92059000 | 12% | Harmonicas, Recorders |
| Microphones | 85181000 | 18% | Dynamic, Condenser mics |
| Audio Amplifiers | 85182200 | 18% | Guitar amps, PA amps |
| Audio Interfaces | 85198990 | 18% | Recording equipment |

### Validation Rules

- **HSN Code**: Must be 4, 6, or 8 digits
- **GST Rate**: Must be one of: 0, 0.25, 3, 5, 12, 18, or 28

---

## 2. Order Creation (Checkout Flow)

### Step-by-Step GST Calculation

When a buyer checks out, the system:

#### Step 1: Fetch Product Data
```typescript
const variantData = await productService.getVariantBySku(productId, variantId);
// Retrieves: product.hsnCode, product.gstRate, variant.price
```

#### Step 2: Calculate Per-Item GST
```typescript
const taxableAmount = price × quantity;
const gstAmount = (taxableAmount × gstRate) / 100;
const totalAmount = taxableAmount + gstAmount;
```

**Example:**
- Price: ₹10,000 (GST-exclusive)
- Quantity: 2
- GST Rate: 18%

```
Taxable Amount = 10,000 × 2 = ₹20,000
GST Amount = 20,000 × 18 / 100 = ₹3,600
Total Amount = 20,000 + 3,600 = ₹23,600
```

#### Step 3: Snapshot HSN and GST Data
```typescript
orderItem = {
  productId, productName, variantId, variantSku,
  price, quantity,
  // Snapshotted tax data
  hsnCode: product.hsnCode,
  gstRate: product.gstRate,
  taxableAmount, gstAmount, totalAmount
}
```

#### Step 4: Calculate Order Totals
```typescript
taxableSubtotal = sum of all item.taxableAmount
totalGst = sum of all item.gstAmount
grandTotal = taxableSubtotal - discount + totalGst
```

### Discount Application

**Important:** Discounts are applied to the GST-exclusive amount, then GST is calculated:

```
1. Calculate taxable subtotal (GST-exclusive)
2. Apply discount to taxable subtotal
3. Calculate GST on discounted amount
4. Grand Total = (Taxable Subtotal - Discount) + GST
```

**Example:**
- Taxable Subtotal: ₹20,000
- Discount: ₹2,000
- GST Rate: 18%

```
After Discount: 20,000 - 2,000 = ₹18,000
GST: 18,000 × 18 / 100 = ₹3,240
Grand Total: 18,000 + 3,240 = ₹21,240
```

---

## 3. Invoice Generation

### Required Fields (All Available in Order Document)

**Per Line Item:**
- Product Name
- HSN Code (snapshotted)
- Quantity
- Unit Price (GST-exclusive)
- Taxable Amount
- GST Rate (snapshotted)
- GST Amount
- Total Amount (including GST)

**Order Totals:**
- Taxable Subtotal
- Discount (if any)
- Total GST
- Grand Total (Payable Amount)

### Sample Invoice Format

```
INVOICE #12345
Date: 01-Feb-2026

ITEMS:
┌──────────────────────────────────────────────────────────────────┐
│ Item: Yamaha F310 Acoustic Guitar                               │
│ HSN: 92071000 | GST Rate: 18%                                    │
│ Qty: 2 | Unit Price: ₹10,000                                     │
│ Taxable Amount: ₹20,000 | GST: ₹3,600 | Total: ₹23,600          │
└──────────────────────────────────────────────────────────────────┘

TOTALS:
  Taxable Subtotal:  ₹20,000
  Discount:          ₹0
  Total GST (18%):   ₹3,600
  ───────────────────────────
  GRAND TOTAL:       ₹23,600
```

---

## 4. Audit Trail & Compliance

### Why Snapshotting Matters

**Problem:** If GST rates change (e.g., from 18% to 12%), old orders must reflect the rate at the time of purchase.

**Solution:** Snapshot HSN code and GST rate into each order item.

```typescript
// Product in database (current)
product.gstRate = 12  // Changed from 18% to 12%

// Order from last year (historical)
order.items[0].gstRate = 18  // Preserved original rate
```

### Audit Compliance Checklist

✅ **HSN code stored per order item**  
✅ **GST rate stored per order item**  
✅ **Taxable amount calculated and stored**  
✅ **GST amount calculated and stored**  
✅ **Order timestamp preserved**  
✅ **No recalculation after order placement**

---

## 5. Mixed GST Rate Orders

The system supports orders with different GST rates:

**Example Order:**
1. Yamaha F310 Guitar (HSN: 92071000, 18% GST) - ₹10,000
2. Hohner Harmonica (HSN: 92059000, 12% GST) - ₹1,200

**Calculation:**
```
Item 1: Taxable ₹10,000 | GST ₹1,800 (18%) | Total ₹11,800
Item 2: Taxable ₹1,200  | GST ₹144 (12%)   | Total ₹1,344

Order Totals:
  Taxable Subtotal: ₹11,200
  Total GST: ₹1,944
  Grand Total: ₹13,144
```

---

## 6. Running the Example

To see GST calculation in action:

```bash
cd backend
npx ts-node src/examples/gst-example.ts
```

This will:
1. Create a sample product with HSN and GST
2. Create an order with GST calculation
3. Display complete breakdown
4. Show invoice-ready data

---

## 7. GraphQL Schema Updates

### Product Type (Updated)

```graphql
type Product {
  id: ID!
  name: String!
  hsnCode: String!      # NEW
  gstRate: Float!       # NEW
  variants: [Variant!]!
  # ... other fields
}
```

### Order Type (Updated)

```graphql
type OrderItem {
  productName: String!
  hsnCode: String!          # NEW (snapshotted)
  gstRate: Float!           # NEW (snapshotted)
  price: Float!
  quantity: Int!
  taxableAmount: Float!     # NEW
  gstAmount: Float!         # NEW
  totalAmount: Float!       # NEW
}

type Order {
  id: ID!
  items: [OrderItem!]!
  taxableSubtotal: Float!   # NEW
  discount: Float!
  totalGst: Float!          # NEW
  grandTotal: Float!        # NEW
  # ... other fields
}
```

---

## 8. Best Practices

### For Sellers

1. **Verify HSN codes** before creating products
2. **Use correct GST rates** based on HSN classification
3. **Don't change HSN/GST** on existing products (create new product instead)

### For Developers

1. **Never recalculate GST** after order is placed
2. **Always snapshot** HSN and GST rate into orders
3. **Round to 2 decimals** for all currency amounts
4. **Apply discounts before GST** calculation

### For Audits

1. **Export order data** with HSN and GST breakdown
2. **Group by HSN code** for GST filing
3. **Verify totals** match payment gateway records

---

## 9. Legal Compliance

This implementation follows Indian GST law:

✅ **Section 15**: Valuation of taxable supply (GST-exclusive pricing)  
✅ **Rule 46**: Tax invoice requirements (HSN code mandatory)  
✅ **CGST Act**: Proper tax calculation and documentation  
✅ **Audit Trail**: Historical data preserved for 6+ years

---

## Support

For questions about:
- **HSN codes**: Refer to [GST HSN Code Finder](https://www.gst.gov.in)
- **GST rates**: Check current rates on GST Council website
- **Implementation**: See `src/examples/gst-example.ts`
