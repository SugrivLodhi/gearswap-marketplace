import { Order, OrderStatus, IOrder, IOrderItem } from './order.model';
import { cartService } from '../cart/cart.service';
import { redis } from '../../config/redis';
import { orderQueue } from '../../config/bullmq';
import { env } from '../../config/environment';

export interface OrderWithItems {
    order: IOrder;
    items: IOrderItem[];
}

class OrderService {
    /**
     * Fetch product details from Catalog service
     */
    private async fetchProductFromCatalog(productId: string): Promise<any> {
        try {
            const response = await fetch(env.catalogServiceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query GetProduct($id: ID!) {
                            product(id: $id) {
                                id
                                name
                                sellerId
                                hsnCode
                                gstRate
                                sgstRate
                                cgstRate
                                igstRate
                                variants {
                                    id
                                    sku
                                    price
                                    stock
                                }
                            }
                        }
                    `,
                    variables: { id: productId },
                }),
            });

            const result = await response.json();
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            return result.data.product;
        } catch (error) {
            console.error('Error fetching product from catalog:', error);
            throw new Error('Failed to fetch product details');
        }
    }

    /**
     * Checkout - Create order from cart (Saga pattern)
     */
    async checkout(buyerId: string): Promise<OrderWithItems> {
        // Step 1: Get cart with pricing
        const cart = await cartService.getCart(buyerId);

        if (cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Step 2: Validate stock and prepare order items
        const orderItems: any[] = [];
        let taxableSubtotal = 0;
        let totalGst = 0;
        let totalSgst = 0;
        let totalCgst = 0;
        let totalIgst = 0;

        for (const item of cart.items) {
            // Fetch fresh product data
            const product = await this.fetchProductFromCatalog(item.productId);
            const variant = product.variants.find((v: any) => v.id === item.variantId);

            if (!variant) {
                throw new Error(`Variant not found: ${item.variantSku}`);
            }

            // Check stock
            if (variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${item.productName}. Available: ${variant.stock}`);
            }

            // Calculate GST
            const taxableAmount = item.price * item.quantity;
            const sgstRate = product.sgstRate || 0;
            const cgstRate = product.cgstRate || 0;
            let igstRate = product.igstRate || 0;

            // If SGST/CGST set, ignore IGST (intra-state)
            if (sgstRate > 0 || cgstRate > 0) {
                igstRate = 0;
            }

            const gstRate = sgstRate + cgstRate + igstRate;
            const sgstAmount = parseFloat(((taxableAmount * sgstRate) / 100).toFixed(2));
            const cgstAmount = parseFloat(((taxableAmount * cgstRate) / 100).toFixed(2));
            const igstAmount = parseFloat(((taxableAmount * igstRate) / 100).toFixed(2));
            const gstAmount = sgstAmount + cgstAmount + igstAmount;
            const totalAmount = taxableAmount + gstAmount;

            taxableSubtotal += taxableAmount;
            totalGst += gstAmount;
            totalSgst += sgstAmount;
            totalCgst += cgstAmount;
            totalIgst += igstAmount;

            orderItems.push({
                productId: item.productId,
                productName: item.productName,
                sellerId: product.sellerId,
                variantId: item.variantId,
                variantSku: item.variantSku,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.subtotal,
                hsnCode: product.hsnCode,
                gstRate,
                taxableAmount,
                gstAmount,
                sgstRate,
                cgstRate,
                igstRate,
                sgstAmount,
                cgstAmount,
                igstAmount,
                totalAmount,
            });
        }

        // Round totals
        taxableSubtotal = parseFloat(taxableSubtotal.toFixed(2));
        totalGst = parseFloat(totalGst.toFixed(2));
        totalSgst = parseFloat(totalSgst.toFixed(2));
        totalCgst = parseFloat(totalCgst.toFixed(2));
        totalIgst = parseFloat(totalIgst.toFixed(2));

        const grandTotal = parseFloat((taxableSubtotal - cart.discount + totalGst).toFixed(2));

        // Step 3: Create order in database
        const order = await Order.createOrder(
            buyerId,
            {
                subtotal: cart.subtotal,
                discount: cart.discount,
                total: cart.total,
                discountCode: cart.discountCode,
                taxableSubtotal,
                totalGst,
                totalSgst,
                totalCgst,
                totalIgst,
                grandTotal,
            },
            orderItems
        );

        // Step 4: Publish event - order.created (for stock deduction in Catalog service)
        await redis.publish(
            'order.created',
            JSON.stringify({
                orderId: order.id,
                items: orderItems.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                })),
            })
        );

        // Step 5: Increment discount usage if applied
        if (cart.discountCode) {
            try {
                const { discountService } = await import('../discount/discount.service');
                const discount = await discountService.getDiscountById(order.discount_code || '');
                if (discount) {
                    await discountService.incrementUsage(discount.id);
                }
            } catch (error) {
                console.warn('Failed to increment discount usage:', error);
            }
        }

        // Step 6: Enqueue order processing job (payment, emails)
        await orderQueue.add('process-order', {
            orderId: order.id,
            buyerId,
        });

        // Step 7: Clear cart
        await cartService.clearCart(buyerId);

        // Step 8: Get order with items
        const orderWithItems = await Order.getOrderById(order.id);

        return orderWithItems!;
    }

    /**
     * Get order by ID
     */
    async getOrderById(orderId: string): Promise<OrderWithItems | null> {
        return await Order.getOrderById(orderId);
    }

    /**
     * List buyer's orders
     */
    async listBuyerOrders(buyerId: string): Promise<IOrder[]> {
        return await Order.listBuyerOrders(buyerId);
    }

    /**
     * List seller's orders
     */
    async listSellerOrders(sellerId: string): Promise<IOrder[]> {
        return await Order.listSellerOrders(sellerId);
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId: string, sellerId: string, newStatus: OrderStatus): Promise<IOrder> {
        // Get order
        const orderData = await Order.getOrderById(orderId);

        if (!orderData) {
            throw new Error('Order not found');
        }

        // Check if seller has products in this order
        const hasProducts = orderData.items.some((item) => item.seller_id === sellerId);

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

        if (!validTransitions[orderData.order.status].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${orderData.order.status} to ${newStatus}`);
        }

        // Update status
        const updatedOrder = await Order.updateOrderStatus(orderId, newStatus);

        // Publish event
        await redis.publish(
            'order.status.updated',
            JSON.stringify({
                orderId,
                oldStatus: orderData.order.status,
                newStatus,
            })
        );

        return updatedOrder;
    }
}

export const orderService = new OrderService();
