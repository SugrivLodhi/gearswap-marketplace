import { discountService } from './discount.service';
import { GraphQLContext, requireAuth, requireRole } from '../../middleware/auth.guard';

export const discountResolvers = {
    Query: {
        discounts: async (_: any, { activeOnly }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER'); // Only sellers can view discounts
            const discounts = await discountService.listDiscounts(activeOnly);
            return discounts.map((d) => ({
                ...d,
                minOrderValue: d.min_order_value,
                maxDiscountAmount: d.max_discount_amount,
                usageLimit: d.usage_limit,
                usageCount: d.usage_count,
                validFrom: d.valid_from.toISOString(),
                validUntil: d.valid_until.toISOString(),
                isActive: d.is_active,
                createdAt: d.created_at.toISOString(),
                updatedAt: d.updated_at.toISOString(),
            }));
        },

        discount: async (_: any, { id }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER');
            const discount = await discountService.getDiscountById(id);
            if (!discount) return null;

            return {
                ...discount,
                minOrderValue: discount.min_order_value,
                maxDiscountAmount: discount.max_discount_amount,
                usageLimit: discount.usage_limit,
                usageCount: discount.usage_count,
                validFrom: discount.valid_from.toISOString(),
                validUntil: discount.valid_until.toISOString(),
                isActive: discount.is_active,
                createdAt: discount.created_at.toISOString(),
                updatedAt: discount.updated_at.toISOString(),
            };
        },

        validateDiscountCode: async (_: any, { code, subtotal }: any, context: GraphQLContext) => {
            requireAuth(context); // Any authenticated user can validate
            const discount = await discountService.validateDiscount(code, subtotal);

            return {
                ...discount,
                minOrderValue: discount.min_order_value,
                maxDiscountAmount: discount.max_discount_amount,
                usageLimit: discount.usage_limit,
                usageCount: discount.usage_count,
                validFrom: discount.valid_from.toISOString(),
                validUntil: discount.valid_until.toISOString(),
                isActive: discount.is_active,
                createdAt: discount.created_at.toISOString(),
                updatedAt: discount.updated_at.toISOString(),
            };
        },
    },

    Mutation: {
        createDiscount: async (_: any, { input }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER'); // Only sellers can create discounts

            const discount = await discountService.createDiscount({
                ...input,
                validFrom: new Date(input.validFrom),
                validUntil: new Date(input.validUntil),
            });

            return {
                ...discount,
                minOrderValue: discount.min_order_value,
                maxDiscountAmount: discount.max_discount_amount,
                usageLimit: discount.usage_limit,
                usageCount: discount.usage_count,
                validFrom: discount.valid_from.toISOString(),
                validUntil: discount.valid_until.toISOString(),
                isActive: discount.is_active,
                createdAt: discount.created_at.toISOString(),
                updatedAt: discount.updated_at.toISOString(),
            };
        },

        updateDiscountStatus: async (_: any, { id, isActive }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER');
            const discount = await discountService.updateDiscountStatus(id, isActive);

            return {
                ...discount,
                minOrderValue: discount.min_order_value,
                maxDiscountAmount: discount.max_discount_amount,
                usageLimit: discount.usage_limit,
                usageCount: discount.usage_count,
                validFrom: discount.valid_from.toISOString(),
                validUntil: discount.valid_until.toISOString(),
                isActive: discount.is_active,
                createdAt: discount.created_at.toISOString(),
                updatedAt: discount.updated_at.toISOString(),
            };
        },

        deleteDiscount: async (_: any, { id }: any, context: GraphQLContext) => {
            requireRole(context, 'SELLER');
            return await discountService.deleteDiscount(id);
        },
    },
};
