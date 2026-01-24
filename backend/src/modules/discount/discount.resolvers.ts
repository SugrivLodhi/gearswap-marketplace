import { GraphQLContext, requireSeller } from '../../middleware/auth.guard';
import {
    discountService,
    CreateDiscountInput,
    UpdateDiscountInput,
} from './discount.service';

export const discountResolvers = {
    Query: {
        // Seller only: List own discounts
        myDiscounts: async (_: any, __: any, context: GraphQLContext) => {
            const user = requireSeller(context);
            return discountService.listSellerDiscounts(user.userId);
        },

        // Public: Validate discount (for cart preview)
        validateDiscount: async (
            _: any,
            { code, cartValue }: { code: string; cartValue: number }
        ) => {
            try {
                const discount = await discountService.validateDiscount(code, cartValue);
                const discountAmount = discountService.calculateDiscount(
                    discount,
                    cartValue
                );
                return {
                    valid: true,
                    discount,
                    discountAmount,
                };
            } catch (error: any) {
                return {
                    valid: false,
                    error: error.message,
                };
            }
        },
    },

    Mutation: {
        // Seller only: Create discount
        createDiscount: async (
            _: any,
            { input }: { input: CreateDiscountInput },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return discountService.createDiscount(user.userId, input);
        },

        // Seller only: Update discount
        updateDiscount: async (
            _: any,
            { id, input }: { id: string; input: UpdateDiscountInput },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return discountService.updateDiscount(id, user.userId, input);
        },

        // Seller only: Delete discount
        deleteDiscount: async (
            _: any,
            { id }: { id: string },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return discountService.deleteDiscount(id, user.userId);
        },
    },
};
