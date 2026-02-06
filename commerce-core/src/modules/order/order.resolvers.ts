import { orderService } from './order.service';
import { GraphQLContext, requireAuth, requireRole } from '../../middleware/auth.guard';

export const orderResolvers = {
    Query: {
        myOrders: async (_: any, __: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            const orders = await orderService.listBuyerOrders(context.user!.userId);
            return orders.map((order) => ({
                ...order,
                buyerId: order.buyer_id,
                discountCode: order.discount_code,
                taxableSubtotal: order.taxable_subtotal,
                totalGst: order.total_gst,
                totalSgst: order.total_sgst,
                totalCgst: order.total_cgst,
                totalIgst: order.total_igst,
                grandTotal: order.grand_total,
                createdAt: order.created_at.toISOString(),
                updatedAt: order.updated_at.toISOString(),
            }));
        },

        sellerOrders: async (_: any, __: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER');
            const orders = await orderService.listSellerOrders(context.user!.userId);
            return orders.map((order) => ({
                ...order,
                buyerId: order.buyer_id,
                discountCode: order.discount_code,
                taxableSubtotal: order.taxable_subtotal,
                totalGst: order.total_gst,
                totalSgst: order.total_sgst,
                totalCgst: order.total_cgst,
                totalIgst: order.total_igst,
                grandTotal: order.grand_total,
                createdAt: order.created_at.toISOString(),
                updatedAt: order.updated_at.toISOString(),
            }));
        },

        order: async (_: any, { id }: any, context: GraphQLContext) => {
            requireAuth(context);
            const orderData = await orderService.getOrderById(id);

            if (!orderData) {
                return null;
            }

            // Check access - buyer or seller
            const isBuyer = orderData.order.buyer_id === context.user!.userId;
            const isSeller = orderData.items.some((item) => item.seller_id === context.user!.userId);

            if (!isBuyer && !isSeller) {
                throw new Error('Access denied');
            }

            return {
                ...orderData.order,
                buyerId: orderData.order.buyer_id,
                discountCode: orderData.order.discount_code,
                taxableSubtotal: orderData.order.taxable_subtotal,
                totalGst: orderData.order.total_gst,
                totalSgst: orderData.order.total_sgst,
                totalCgst: orderData.order.total_cgst,
                totalIgst: orderData.order.total_igst,
                grandTotal: orderData.order.grand_total,
                items: orderData.items,
                createdAt: orderData.order.created_at.toISOString(),
                updatedAt: orderData.order.updated_at.toISOString(),
            };
        },
    },

    Mutation: {
        checkout: async (_: any, __: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            const orderData = await orderService.checkout(context.user!.userId);

            return {
                ...orderData.order,
                buyerId: orderData.order.buyer_id,
                discountCode: orderData.order.discount_code,
                taxableSubtotal: orderData.order.taxable_subtotal,
                totalGst: orderData.order.total_gst,
                totalSgst: orderData.order.total_sgst,
                totalCgst: orderData.order.total_cgst,
                totalIgst: orderData.order.total_igst,
                grandTotal: orderData.order.grand_total,
                items: orderData.items,
                createdAt: orderData.order.created_at.toISOString(),
                updatedAt: orderData.order.updated_at.toISOString(),
            };
        },

        updateOrderStatus: async (_: any, { orderId, status }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER');
            const order = await orderService.updateOrderStatus(orderId, context.user!.userId, status);

            return {
                ...order,
                buyerId: order.buyer_id,
                discountCode: order.discount_code,
                taxableSubtotal: order.taxable_subtotal,
                totalGst: order.total_gst,
                totalSgst: order.total_sgst,
                totalCgst: order.total_cgst,
                totalIgst: order.total_igst,
                grandTotal: order.grand_total,
                createdAt: order.created_at.toISOString(),
                updatedAt: order.updated_at.toISOString(),
            };
        },
    },

    Order: {
        // No special resolvers needed, all fields are returned directly
    },

    OrderItem: {
        productId: (item: any) => item.product_id,
        productName: (item: any) => item.product_name,
        sellerId: (item: any) => item.seller_id,
        variantId: (item: any) => item.variant_id,
        variantSku: (item: any) => item.variant_sku,
        hsnCode: (item: any) => item.hsn_code,
        gstRate: (item: any) => item.gst_rate,
        taxableAmount: (item: any) => item.taxable_amount,
        gstAmount: (item: any) => item.gst_amount,
        sgstRate: (item: any) => item.sgst_rate,
        cgstRate: (item: any) => item.cgst_rate,
        igstRate: (item: any) => item.igst_rate,
        sgstAmount: (item: any) => item.sgst_amount,
        cgstAmount: (item: any) => item.cgst_amount,
        igstAmount: (item: any) => item.igst_amount,
        totalAmount: (item: any) => item.total_amount,
    },
};
