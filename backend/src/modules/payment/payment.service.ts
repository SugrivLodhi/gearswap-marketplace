/**
 * Mock Razorpay Payment Service
 * 
 * This is a mock implementation for development/testing.
 * In production, replace with actual Razorpay SDK integration.
 */

export interface RazorpayOrderInput {
    amount: number; // Amount in paise (₹1 = 100 paise)
    currency: string; // 'INR'
    receipt: string; // Order ID or unique receipt number
    notes?: Record<string, string>; // Additional metadata
}

export interface RazorpayOrder {
    id: string; // Razorpay order ID (e.g., 'order_ABC123xyz')
    entity: 'order';
    amount: number; // Amount in paise
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, string>;
    created_at: number; // Unix timestamp
}

export interface RazorpayPaymentVerification {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

class MockRazorpayService {
    private mockOrderCounter = 1000;
    private mockPaymentCounter = 5000;

    /**
     * Create a Razorpay order
     * In production: Use Razorpay SDK
     */
    async createOrder(input: RazorpayOrderInput): Promise<RazorpayOrder> {
        // Validate amount
        if (input.amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        // Mock Razorpay order creation
        const orderId = `order_${this.generateMockId()}`;

        const razorpayOrder: RazorpayOrder = {
            id: orderId,
            entity: 'order',
            amount: input.amount,
            amount_paid: 0,
            amount_due: input.amount,
            currency: input.currency,
            receipt: input.receipt,
            status: 'created',
            attempts: 0,
            notes: input.notes || {},
            created_at: Math.floor(Date.now() / 1000),
        };

        console.log('🔷 Mock Razorpay Order Created:', {
            orderId: razorpayOrder.id,
            amount: `₹${(razorpayOrder.amount / 100).toFixed(2)}`,
            receipt: razorpayOrder.receipt,
        });

        return razorpayOrder;
    }

    /**
     * Verify payment signature
     * In production: Use Razorpay crypto verification
     */
    verifyPaymentSignature(verification: RazorpayPaymentVerification): boolean {
        // Mock verification - always returns true for testing
        // In production, use Razorpay's signature verification:
        // const crypto = require('crypto');
        // const hmac = crypto.createHmac('sha256', razorpay_secret);
        // hmac.update(order_id + "|" + payment_id);
        // const generated_signature = hmac.digest('hex');
        // return generated_signature === razorpay_signature;

        console.log('🔐 Mock Payment Signature Verified:', {
            orderId: verification.razorpay_order_id,
            paymentId: verification.razorpay_payment_id,
        });

        return true;
    }

    /**
     * Generate mock Razorpay ID
     */
    private generateMockId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 14; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Simulate successful payment (for testing)
     */
    async simulatePayment(orderId: string): Promise<{
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }> {
        const paymentId = `pay_${this.generateMockId()}`;
        const signature = this.generateMockId();

        console.log('💳 Mock Payment Simulated:', {
            orderId,
            paymentId,
            status: 'success',
        });

        return {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
        };
    }
}

export const razorpayService = new MockRazorpayService();

/**
 * PRODUCTION INTEGRATION GUIDE
 * 
 * To use real Razorpay in production:
 * 
 * 1. Install Razorpay SDK:
 *    npm install razorpay
 * 
 * 2. Set environment variables:
 *    RAZORPAY_KEY_ID=your_key_id
 *    RAZORPAY_KEY_SECRET=your_key_secret
 * 
 * 3. Replace MockRazorpayService with:
 * 
 *    import Razorpay from 'razorpay';
 * 
 *    const razorpay = new Razorpay({
 *      key_id: process.env.RAZORPAY_KEY_ID,
 *      key_secret: process.env.RAZORPAY_KEY_SECRET,
 *    });
 * 
 *    async createOrder(input: RazorpayOrderInput) {
 *      return await razorpay.orders.create(input);
 *    }
 * 
 *    verifyPaymentSignature(verification: RazorpayPaymentVerification) {
 *      const crypto = require('crypto');
 *      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
 *      hmac.update(verification.razorpay_order_id + "|" + verification.razorpay_payment_id);
 *      const generated_signature = hmac.digest('hex');
 *      return generated_signature === verification.razorpay_signature;
 *    }
 * 
 * 4. Frontend Integration:
 *    - Load Razorpay checkout script
 *    - Pass order ID from backend
 *    - Handle payment success/failure callbacks
 *    - Send payment details to backend for verification
 */
