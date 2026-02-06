import { cartService } from './cart.service';
import { GraphQLContext, requireAuth, requireRole } from '../../middleware/auth.guard';

export const cartResolvers = {
    Query: {
        myCart: async (_: any, __: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.getCart(context.user!.userId);
        },
    },

    Mutation: {
        addToCart: async (_: any, { input }: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.addToCart(context.user!.userId, input);
        },

        updateCartItem: async (_: any, { input }: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.updateCartItem(context.user!.userId, input);
        },

        removeFromCart: async (_: any, { productId, variantId }: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.removeFromCart(context.user!.userId, productId, variantId);
        },

        clearCart: async (_: any, __: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.clearCart(context.user!.userId);
        },

        applyDiscount: async (_: any, { code }: any, context: GraphQLContext) => {
            requireRole(context, 'BUYER');
            return await cartService.applyDiscount(context.user!.userId, code);
        },
    },

    CartItem: {
        product: (item: any) => {
            // Return reference to Product - Catalog service will resolve
            return { __typename: 'Product', id: item.productId };
        },
    },

    Cart: {
        // No special resolvers needed, all fields are returned directly
    },

    Product: {
        __resolveReference: (reference: { id: string }) => {
            // Return reference - Catalog service will resolve full details
            return { __typename: 'Product', id: reference.id };
        },
    },
};
