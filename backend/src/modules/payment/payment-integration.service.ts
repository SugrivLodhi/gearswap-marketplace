import { razorpayService } from './payment.service';
import { orderService } from '../order/order.service';
import { Order, OrderStatus } from '../order/order.model';

/**
 * Payment Integration with Order Service
 * 
 * This service handles the complete payment flow:
 * 1. Create Razorpay order after checkout
 * 2. Verify payment
 * 3. Update order status
 */

class PaymentIntegrationService {
    /**
     * Initiate payment for an order
     * Called after checkout to create Razorpay order
     */
    async initiatePayment(orderId: string, buyerId: string): Promise<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        orderDetails: any;
    }> {
        // Get order details
        const order = await orderService.getOrderById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Verify buyer owns this order
        if (order.buyerId.toString() !== buyerId) {
            throw new Error('Access denied');
        }

        // Order must be in PENDING status
        if (order.status !== OrderStatus.PENDING) {
            throw new Error('Order is not in pending status');
        }

        // Convert amount to paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(order.grandTotal * 100);

        // Create Razorpay order
        const razorpayOrder = await razorpayService.createOrder({
            amount: amountInPaise,
            currency: 'INR',
            receipt: orderId,
            notes: {
                orderId: orderId,
                buyerId: buyerId,
                itemCount: order.items.length.toString(),
            },
        });

        return {
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderDetails: {
                orderId: order._id,
                taxableSubtotal: order.taxableSubtotal,
                totalGst: order.totalGst,
                discount: order.discount,
                grandTotal: order.grandTotal,
                items: order.items.map(item => ({
                    name: item.productName,
                    quantity: item.quantity,
                    amount: item.totalAmount,
                })),
            },
        };
    }

    /**
     * Verify payment and update order status
     * Called after successful payment on frontend
     */
    async verifyAndCompletePayment(
        orderId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string
    ): Promise<{ success: boolean; order: any }> {
        // Verify payment signature
        const isValid = razorpayService.verifyPaymentSignature({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
        });

        if (!isValid) {
            throw new Error('Invalid payment signature');
        }

        // Get order
        const order = await Order.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Update order status to PAID
        order.status = OrderStatus.PAID;
        await order.save();

        console.log('✅ Payment verified and order updated:', {
            orderId: order._id,
            status: order.status,
            amount: order.grandTotal,
            paymentId: razorpayPaymentId,
        });

        return {
            success: true,
            order: {
                id: order._id,
                status: order.status,
                grandTotal: order.grandTotal,
                items: order.items,
            },
        };
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(orderId: string, reason: string): Promise<void> {
        console.log('❌ Payment failed:', {
            orderId,
            reason,
        });

        // Order remains in PENDING status
        // Buyer can retry payment or cancel order
    }
}

export const paymentIntegrationService = new PaymentIntegrationService();
