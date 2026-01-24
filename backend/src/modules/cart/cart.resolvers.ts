import { GraphQLContext, requireBuyer } from '../../middleware/auth.guard';
import {
    cartService,
    AddToCartInput,
    UpdateCartItemInput,
} from './cart.service';

export const cartResolvers = {
    Query: {
        // Buyer only: Get cart with pricing
        myCart: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireBuyer(context);
            return cartService.getCartWithPricing(user.userId);
        },
    },

    Mutation: {
        // Buyer only: Add to cart
        addToCart: async (
            _: any,
            { input }: { input: AddToCartInput },
            context: GraphQLContext
        ) => {
            const user = requireBuyer(context);
            await cartService.addToCart(user.userId, input);
            return cartService.getCartWithPricing(user.userId);
        },

        // Buyer only: Update cart item
        updateCartItem: async (
            _: any,
            { input }: { input: UpdateCartItemInput },
            context: GraphQLContext
        ) => {
            const user = requireBuyer(context);
            await cartService.updateCartItem(user.userId, input);
            return cartService.getCartWithPricing(user.userId);
        },

        // Buyer only: Remove from cart
        removeFromCart: async (
            _: any,
            { productId, variantId }: { productId: string; variantId: string },
            context: GraphQLContext
        ) => {
            const user = requireBuyer(context);
            await cartService.removeFromCart(user.userId, productId, variantId);
            return cartService.getCartWithPricing(user.userId);
        },

        // Buyer only: Apply discount
        applyDiscount: async (
            _: any,
            { code }: { code: string },
            context: GraphQLContext
        ) => {
            const user = requireBuyer(context);
            await cartService.applyDiscount(user.userId, code);
            return cartService.getCartWithPricing(user.userId);
        },

        // Buyer only: Remove discount
        removeDiscount: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireBuyer(context);
            await cartService.removeDiscount(user.userId);
            return cartService.getCartWithPricing(user.userId);
        },
    },
};
