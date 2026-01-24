import {
    GraphQLContext,
    requireBuyer,
    requireSeller,
    requireAuth,
} from '../../middleware/auth.guard';
import { orderService } from './order.service';
import { OrderStatus } from './order.model';
import { UserRole } from '../auth/auth.model';

export const orderResolvers = {
    Query: {
        // Buyer only: List own orders
        myOrders: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireBuyer(context);
            return orderService.listBuyerOrders(user.userId);
        },

        // Seller only: List orders with own products
        sellerOrders: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireSeller(context);
            return orderService.listSellerOrders(user.userId);
        },

        // Seller only: Get seller statistics
        sellerStats: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireSeller(context);
            return orderService.getSellerStats(user.userId);
        },

        // Authenticated: Get order by ID (must be buyer or seller in order)
        order: async (_: any, { id }: { id: string }, context: GraphQLContext) => {
            const user = requireAuth(context);
            const order = await orderService.getOrderById(id);

            if (!order) {
                throw new Error('Order not found');
            }

            // Check access
            const isBuyer = order.buyerId.toString() === user.userId;
            const isSeller = order.items.some(
                (item) => item.sellerId.toString() === user.userId
            );

            if (!isBuyer && !isSeller) {
                throw new Error('Access denied');
            }

            return order;
        },
    },

    Mutation: {
        // Buyer only: Checkout (create order from cart)
        checkout: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireBuyer(context);
            return orderService.checkout(user.userId);
        },

        // Seller only: Update order status
        updateOrderStatus: async (
            _: any,
            { orderId, status }: { orderId: string; status: OrderStatus },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return orderService.updateOrderStatus(orderId, user.userId, status);
        },
    },
};
