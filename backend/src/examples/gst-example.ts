import mongoose from 'mongoose';
import { Product } from '../modules/product/product.model';
import { Order } from '../modules/order/order.model';
import { User, UserRole } from '../modules/auth/auth.model';
import { connectDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

/**
 * GST Calculation Example
 * 
 * This example demonstrates:
 * 1. Creating a product with HSN code and GST rate
 * 2. Creating an order with GST calculation
 * 3. Displaying GST breakdown per item and order totals
 */

async function runGstExample() {
    try {
        console.log('🧮 GST Calculation Example\n');
        console.log('='.repeat(80));

        // Connect to database
        await connectDatabase();

        // Create a test buyer
        const hashedPassword = await bcrypt.hash('password123', 10);
        const buyer = await User.create({
            email: 'test.buyer@example.com',
            password: hashedPassword,
            role: UserRole.BUYER,
        });

        const seller = await User.create({
            email: 'test.seller@example.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        console.log('\n📦 Creating Sample Product with HSN and GST\n');

        // Create a product with HSN code and GST rate
        const product = await Product.create({
            name: 'Yamaha F310 Acoustic Guitar (Test)',
            description: 'Popular beginner acoustic guitar with excellent build quality',
            category: 'Acoustic Guitars',
            imageUrl: 'https://example.com/yamaha-f310.jpg',
            sellerId: seller._id,
            hsnCode: '92071000', // HSN code for string musical instruments
            gstRate: 18, // 18% GST
            variants: [
                {
                    sku: 'TEST-F310-NAT-' + Date.now(), // Unique SKU for testing
                    price: 10000, // ₹10,000 (GST-exclusive)
                    stock: 100,
                    attributes: { color: 'Natural', finish: 'Matte' },
                },
            ],
        });

        console.log('Product Created:');
        console.log(`  Name: ${product.name}`);
        console.log(`  HSN Code: ${product.hsnCode}`);
        console.log(`  GST Rate: ${product.gstRate}%`);
        console.log(`  Base Price (GST-exclusive): ₹${product.variants[0].price.toLocaleString('en-IN')}`);

        console.log('\n' + '='.repeat(80));
        console.log('\n🛒 Creating Order with GST Calculation\n');

        // Simulate order creation with GST calculation
        const variant = product.variants[0];
        const quantity = 2;

        // Calculate GST (same logic as in order.service.ts)
        const taxableAmount = variant.price * quantity;
        const gstAmount = parseFloat(((taxableAmount * product.gstRate) / 100).toFixed(2));
        const totalAmount = taxableAmount + gstAmount;

        // Create order with GST breakdown
        const order = await Order.create({
            buyerId: buyer._id,
            items: [
                {
                    productId: product._id,
                    productName: product.name,
                    sellerId: seller._id,
                    variantId: variant._id!,
                    variantSku: variant.sku,
                    price: variant.price,
                    quantity: quantity,
                    subtotal: taxableAmount, // Deprecated field
                    // GST fields (snapshotted)
                    hsnCode: product.hsnCode,
                    gstRate: product.gstRate,
                    taxableAmount,
                    gstAmount,
                    totalAmount,
                },
            ],
            status: 'PENDING',
            subtotal: taxableAmount, // Deprecated
            discount: 0,
            total: totalAmount, // Deprecated
            // GST breakdown
            taxableSubtotal: taxableAmount,
            totalGst: gstAmount,
            grandTotal: totalAmount,
        });

        console.log('Order Created Successfully!\n');
        console.log('ORDER DETAILS:');
        console.log('-'.repeat(80));
        console.log(`Order ID: ${order._id}`);
        console.log(`Buyer: ${buyer.email}`);
        console.log(`Status: ${order.status}`);
        console.log(`Created: ${order.createdAt.toLocaleString('en-IN')}\n`);

        console.log('ITEM BREAKDOWN:');
        console.log('-'.repeat(80));
        order.items.forEach((item, index) => {
            console.log(`\nItem ${index + 1}: ${item.productName}`);
            console.log(`  SKU: ${item.variantSku}`);
            console.log(`  HSN Code: ${item.hsnCode} (Snapshotted)`);
            console.log(`  GST Rate: ${item.gstRate}% (Snapshotted)`);
            console.log(`  Unit Price (GST-exclusive): ₹${item.price.toLocaleString('en-IN')}`);
            console.log(`  Quantity: ${item.quantity}`);
            console.log(`  Taxable Amount: ₹${item.taxableAmount.toLocaleString('en-IN')}`);
            console.log(`  GST Amount (${item.gstRate}%): ₹${item.gstAmount.toLocaleString('en-IN')}`);
            console.log(`  Total Amount (incl. GST): ₹${item.totalAmount.toLocaleString('en-IN')}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('\nORDER TOTALS:');
        console.log('-'.repeat(80));
        console.log(`Taxable Subtotal (GST-exclusive): ₹${order.taxableSubtotal.toLocaleString('en-IN')}`);
        console.log(`Discount Applied: ₹${order.discount.toLocaleString('en-IN')}`);
        console.log(`Total GST: ₹${order.totalGst.toLocaleString('en-IN')}`);
        console.log(`Grand Total (Payable): ₹${order.grandTotal.toLocaleString('en-IN')}`);

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ GST INVOICE READY DATA:');
        console.log('-'.repeat(80));
        console.log('The order contains all fields required for GST-compliant invoices:');
        console.log('  ✓ Per-item HSN codes (snapshotted)');
        console.log('  ✓ Per-item GST rates (snapshotted)');
        console.log('  ✓ Per-item taxable amounts');
        console.log('  ✓ Per-item GST amounts');
        console.log('  ✓ Order-level GST breakdown');
        console.log('  ✓ Audit trail (createdAt timestamp)');

        console.log('\n' + '='.repeat(80));
        console.log('\n🔒 AUDIT COMPLIANCE:');
        console.log('-'.repeat(80));
        console.log('Even if product HSN/GST changes in the future, this order retains:');
        console.log(`  Original HSN Code: ${order.items[0].hsnCode}`);
        console.log(`  Original GST Rate: ${order.items[0].gstRate}%`);
        console.log('This ensures historical accuracy for tax audits.');

        console.log('\n' + '='.repeat(80));
        console.log('\n🎉 Example Complete!\n');

        // Cleanup
        await User.deleteMany({ email: { $in: ['test.buyer@example.com', 'test.seller@example.com'] } });
        await Product.deleteOne({ _id: product._id });
        await Order.deleteOne({ _id: order._id });

    } catch (error) {
        console.error('❌ Example failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

runGstExample();
