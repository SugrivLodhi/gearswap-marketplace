import { redis } from '../config/redis';
import { productService } from '../modules/product/product.service';

/**
 * Event subscriber for order.created event
 * Deducts stock when an order is created
 */
export async function subscribeToOrderEvents() {
    const subscriber = redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('order.created', async (message) => {
        try {
            const event = JSON.parse(message);
            console.log('Received order.created event:', event.orderId);

            // Deduct stock for each item
            for (const item of event.items) {
                try {
                    await productService.updateVariantStock(
                        item.productId,
                        item.variantId,
                        -item.quantity
                    );
                    console.log(`Stock deducted for product ${item.productId}, variant ${item.variantId}`);
                } catch (error) {
                    console.error(`Failed to deduct stock for product ${item.productId}:`, error);

                    // Publish stock deduction failed event
                    await redis.publish(
                        'stock.deduction.failed',
                        JSON.stringify({
                            orderId: event.orderId,
                            productId: item.productId,
                            variantId: item.variantId,
                            error: (error as Error).message,
                        })
                    );
                }
            }

            // Publish success event
            await redis.publish(
                'stock.deducted',
                JSON.stringify({
                    orderId: event.orderId,
                })
            );
        } catch (error) {
            console.error('Error processing order.created event:', error);
        }
    });

    console.log('Subscribed to order.created events');
}
