import { connectDatabase } from '../config/database';
import { Order } from '../modules/order/order.model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const fixOrders = async () => {
    try {
        console.log('🔌 Connecting to database...');
        await connectDatabase();

        console.log('🔍 Checking for legacy orders...');
        const orders = await Order.find({});

        let updatedCount = 0;

        for (const order of orders) {
            let orderModified = false;

            // Fix Order Items
            // @ts-ignore
            order.items = order.items.map(item => {
                const legacyItem = item as any;
                if (!legacyItem.hsnCode) {
                    orderModified = true;
                    // Calculate reasonable defaults or use 0
                    const price = legacyItem.price || 0;
                    const quantity = legacyItem.quantity || 1;
                    const subtotal = legacyItem.subtotal || (price * quantity);

                    return {
                        ...legacyItem, // Preserve existing fields
                        productId: legacyItem.productId,
                        productName: legacyItem.productName || 'Legacy Product',
                        sellerId: legacyItem.sellerId,
                        variantId: legacyItem.variantId,
                        variantSku: legacyItem.variantSku || 'LEGACY',
                        price: price,
                        quantity: quantity,
                        subtotal: subtotal,
                        // CONSTANTS for Legacy
                        hsnCode: 'LEGACY',
                        gstRate: 0,
                        taxableAmount: subtotal,
                        gstAmount: 0,
                        totalAmount: subtotal
                    };
                }
                return item;
            });

            // Fix Order Totals
            // @ts-ignore
            if (order.taxableSubtotal === undefined || order.totalGst === undefined || order.grandTotal === undefined) {
                orderModified = true;
                // @ts-ignore
                order.taxableSubtotal = order.subtotal || 0;
                // @ts-ignore
                order.totalGst = 0;
                // @ts-ignore
                order.grandTotal = order.total || order.subtotal || 0;
            }

            if (orderModified) {
                // We use updateOne to bypass strict validation if needed, or save() 
                // But save() might validate against schema. 
                // Since we populated fields, save() should work.
                await order.save();
                updatedCount++;
                console.log(`✅ Fixed Order ${order._id}`);
            }
        }

        console.log(`🎉 Finished! Fixed ${updatedCount} orders.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing orders:', error);
        process.exit(1);
    }
};

fixOrders();
