import { db } from '../../config/database';

export enum OrderStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    COMPLETED = 'COMPLETED',
}

export interface IOrder {
    id: string;
    buyer_id: string;
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    discount_code?: string;
    taxable_subtotal: number;
    total_gst: number;
    total_sgst: number;
    total_cgst: number;
    total_igst: number;
    grand_total: number;
    created_at: Date;
    updated_at: Date;
}

export interface IOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    seller_id: string;
    variant_id: string;
    variant_sku: string;
    price: number;
    quantity: number;
    subtotal: number;
    hsn_code: string;
    gst_rate: number;
    taxable_amount: number;
    gst_amount: number;
    sgst_rate: number;
    cgst_rate: number;
    igst_rate: number;
    sgst_amount: number;
    cgst_amount: number;
    igst_amount: number;
    total_amount: number;
}

export class OrderModel {
    /**
     * Create order with items
     */
    async createOrder(
        buyerId: string,
        orderData: {
            subtotal: number;
            discount: number;
            total: number;
            discountCode?: string;
            taxableSubtotal: number;
            totalGst: number;
            totalSgst: number;
            totalCgst: number;
            totalIgst: number;
            grandTotal: number;
        },
        items: Array<{
            productId: string;
            productName: string;
            sellerId: string;
            variantId: string;
            variantSku: string;
            price: number;
            quantity: number;
            subtotal: number;
            hsnCode: string;
            gstRate: number;
            taxableAmount: number;
            gstAmount: number;
            sgstRate: number;
            cgstRate: number;
            igstRate: number;
            sgstAmount: number;
            cgstAmount: number;
            igstAmount: number;
            totalAmount: number;
        }>
    ): Promise<IOrder> {
        return await db.transaction(async (client) => {
            // Create order
            const orderResult = await client.query(
                `INSERT INTO orders (
                    buyer_id, status, subtotal, discount, total, discount_code,
                    taxable_subtotal, total_gst, total_sgst, total_cgst, total_igst, grand_total
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, buyer_id, status, subtotal, discount, total, discount_code,
                          taxable_subtotal, total_gst, total_sgst, total_cgst, total_igst, grand_total,
                          created_at, updated_at`,
                [
                    buyerId,
                    OrderStatus.PENDING,
                    orderData.subtotal,
                    orderData.discount,
                    orderData.total,
                    orderData.discountCode,
                    orderData.taxableSubtotal,
                    orderData.totalGst,
                    orderData.totalSgst,
                    orderData.totalCgst,
                    orderData.totalIgst,
                    orderData.grandTotal,
                ]
            );

            const order = orderResult.rows[0];

            // Create order items
            for (const item of items) {
                await client.query(
                    `INSERT INTO order_items (
                        order_id, product_id, product_name, seller_id, variant_id, variant_sku,
                        price, quantity, subtotal, hsn_code, gst_rate, taxable_amount, gst_amount,
                        sgst_rate, cgst_rate, igst_rate, sgst_amount, cgst_amount, igst_amount, total_amount
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
                    [
                        order.id,
                        item.productId,
                        item.productName,
                        item.sellerId,
                        item.variantId,
                        item.variantSku,
                        item.price,
                        item.quantity,
                        item.subtotal,
                        item.hsnCode,
                        item.gstRate,
                        item.taxableAmount,
                        item.gstAmount,
                        item.sgstRate,
                        item.cgstRate,
                        item.igstRate,
                        item.sgstAmount,
                        item.cgstAmount,
                        item.igstAmount,
                        item.totalAmount,
                    ]
                );
            }

            return order;
        });
    }

    /**
     * Get order by ID with items
     */
    async getOrderById(orderId: string): Promise<{ order: IOrder; items: IOrderItem[] } | null> {
        const orderResult = await db.query(
            `SELECT id, buyer_id, status, subtotal, discount, total, discount_code,
                    taxable_subtotal, total_gst, total_sgst, total_cgst, total_igst, grand_total,
                    created_at, updated_at
             FROM orders WHERE id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            return null;
        }

        const itemsResult = await db.query(
            `SELECT id, order_id, product_id, product_name, seller_id, variant_id, variant_sku,
                    price, quantity, subtotal, hsn_code, gst_rate, taxable_amount, gst_amount,
                    sgst_rate, cgst_rate, igst_rate, sgst_amount, cgst_amount, igst_amount, total_amount
             FROM order_items WHERE order_id = $1`,
            [orderId]
        );

        return {
            order: orderResult.rows[0],
            items: itemsResult.rows,
        };
    }

    /**
     * List buyer's orders
     */
    async listBuyerOrders(buyerId: string): Promise<IOrder[]> {
        const result = await db.query(
            `SELECT id, buyer_id, status, subtotal, discount, total, discount_code,
                    taxable_subtotal, total_gst, total_sgst, total_cgst, total_igst, grand_total,
                    created_at, updated_at
             FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC`,
            [buyerId]
        );

        return result.rows;
    }

    /**
     * List seller's orders
     */
    async listSellerOrders(sellerId: string): Promise<IOrder[]> {
        const result = await db.query(
            `SELECT DISTINCT o.id, o.buyer_id, o.status, o.subtotal, o.discount, o.total, o.discount_code,
                    o.taxable_subtotal, o.total_gst, o.total_sgst, o.total_cgst, o.total_igst, o.grand_total,
                    o.created_at, o.updated_at
             FROM orders o
             INNER JOIN order_items oi ON o.id = oi.order_id
             WHERE oi.seller_id = $1
             ORDER BY o.created_at DESC`,
            [sellerId]
        );

        return result.rows;
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<IOrder> {
        const result = await db.query(
            `UPDATE orders SET status = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING id, buyer_id, status, subtotal, discount, total, discount_code,
                       taxable_subtotal, total_gst, total_sgst, total_cgst, total_igst, grand_total,
                       created_at, updated_at`,
            [orderId, status]
        );

        return result.rows[0];
    }
}

export const Order = new OrderModel();
