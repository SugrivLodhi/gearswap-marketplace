import { Order, IOrder, OrderStatus, IOrderItem } from './order.model';
import { cartService } from '../cart/cart.service';
import { productService } from '../product/product.service';
import { discountService } from '../discount/discount.service';
import mongoose from 'mongoose';

class OrderService {
    /**
     * Create order from cart (checkout)
     */
    async checkout(buyerId: string): Promise<IOrder> {
        // Get cart with pricing
        const cartData = await cartService.getCartWithPricing(buyerId);

        if (cartData.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Validate stock and prepare order items with GST calculation
        const orderItems: IOrderItem[] = [];
        let taxableSubtotal = 0;
        let totalGst = 0;

        for (const item of cartData.items) {
            // Get fresh product data with HSN and GST rate
            const variantData = await productService.getVariantBySku(
                item.productId,
                item.variantId
            );

            if (!variantData) {
                throw new Error(
                    `Product or variant not found: ${item.productName} (${item.variantSku})`
                );
            }

            // Check stock
            if (variantData.variant.stock < item.quantity) {
                throw new Error(
                    `Insufficient stock for ${item.productName} (${item.variantSku}). Available: ${variantData.variant.stock}`
                );
            }

            // Calculate GST for this item
            const taxableAmount = item.price * item.quantity;
            const gstAmount = parseFloat(((taxableAmount * variantData.product.gstRate) / 100).toFixed(2));
            const totalAmount = taxableAmount + gstAmount;

            // Accumulate totals
            taxableSubtotal += taxableAmount;
            totalGst += gstAmount;

            // Prepare order item with GST snapshot
            orderItems.push({
                productId: new mongoose.Types.ObjectId(item.productId),
                productName: item.productName,
                sellerId: variantData.product.sellerId,
                variantId: new mongoose.Types.ObjectId(item.variantId),
                variantSku: item.variantSku,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.subtotal, // Deprecated field for backward compatibility
                // GST fields (snapshotted at order time)
                hsnCode: variantData.product.hsnCode,
                gstRate: variantData.product.gstRate,
                taxableAmount,
                gstAmount,
                totalAmount,
            });
        }

        // Round totals to 2 decimal places
        taxableSubtotal = parseFloat(taxableSubtotal.toFixed(2));
        totalGst = parseFloat(totalGst.toFixed(2));

        // Get discount code if applied
        let discountCode: string | undefined;
        let discountAmount = cartData.discount;

        if (cartData.cart.discountId) {
            const discount = await discountService.getDiscountById(
                cartData.cart.discountId.toString()
            );
            if (discount) {
                discountCode = discount.code;
            }
        }

        // Calculate grand total (taxable subtotal - discount + GST)
        // Note: Discount is applied to taxable amount, then GST is calculated
        const grandTotal = parseFloat((taxableSubtotal - discountAmount + totalGst).toFixed(2));

        // Create order with GST breakdown
        const order = await Order.create({
            buyerId: new mongoose.Types.ObjectId(buyerId),
            items: orderItems,
            status: OrderStatus.PENDING,
            subtotal: cartData.subtotal, // Deprecated field for backward compatibility
            discount: discountAmount,
            total: cartData.total, // Deprecated field for backward compatibility
            discountCode,
            // GST breakdown fields
            taxableSubtotal,
            totalGst,
            grandTotal,
        });

        // Deduct stock for each item
        for (const item of cartData.items) {
            await productService.updateVariantStock(
                item.productId,
                item.variantId,
                -item.quantity
            );
        }

        // Increment discount usage if applied
        if (cartData.cart.discountId) {
            await discountService.incrementUsage(
                cartData.cart.discountId.toString()
            );
        }

        // Clear cart
        await cartService.clearCart(buyerId);

        return order;
    }

    /**
     * Get order by ID
     */
    async getOrderById(orderId: string): Promise<IOrder | null> {
        return Order.findById(orderId).populate('buyerId', 'email');
    }

    /**
     * List buyer's orders
     */
    async listBuyerOrders(buyerId: string): Promise<IOrder[]> {
        return Order.find({
            buyerId: new mongoose.Types.ObjectId(buyerId),
        })
            .sort({ createdAt: -1 })
            .populate('buyerId', 'email');
    }

    /**
     * List seller's orders (orders containing their products)
     */
    async listSellerOrders(sellerId: string): Promise<IOrder[]> {
        return Order.find({
            'items.sellerId': new mongoose.Types.ObjectId(sellerId),
        })
            .sort({ createdAt: -1 })
            .populate('buyerId', 'email');
    }

    /**
     * Update order status (seller only, for their products)
     */
    async updateOrderStatus(
        orderId: string,
        sellerId: string,
        newStatus: OrderStatus
    ): Promise<IOrder> {
        const order = await Order.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Check if seller has products in this order
        const hasProducts = order.items.some(
            (item) => item.sellerId.toString() === sellerId
        );

        if (!hasProducts) {
            throw new Error('Access denied: No products from this seller in order');
        }

        // Validate status transition
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            [OrderStatus.PENDING]: [OrderStatus.PAID],
            [OrderStatus.PAID]: [OrderStatus.SHIPPED],
            [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
            [OrderStatus.COMPLETED]: [],
        };

        if (!validTransitions[order.status].includes(newStatus)) {
            throw new Error(
                `Invalid status transition from ${order.status} to ${newStatus}`
            );
        }

        order.status = newStatus;
        await order.save();

        return order;
    }

    /**
     * Get order statistics for seller
     */
    async getSellerStats(sellerId: string): Promise<{
        totalOrders: number;
        totalRevenue: number;
        pendingOrders: number;
    }> {
        const orders = await this.listSellerOrders(sellerId);

        // Calculate stats for seller's items only
        let totalRevenue = 0;
        let pendingOrders = 0;

        for (const order of orders) {
            const sellerItems = order.items.filter(
                (item) => item.sellerId.toString() === sellerId
            );

            const sellerRevenue = sellerItems.reduce(
                (sum, item) => sum + item.subtotal,
                0
            );

            totalRevenue += sellerRevenue;

            if (order.status === OrderStatus.PENDING) {
                pendingOrders++;
            }
        }

        return {
            totalOrders: orders.length,
            totalRevenue,
            pendingOrders,
        };
    }
}

export const orderService = new OrderService();
