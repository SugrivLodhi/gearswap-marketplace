import { authResolvers } from '../modules/auth/auth.resolvers';
import { productResolvers } from '../modules/product/product.resolvers';
import { cartResolvers } from '../modules/cart/cart.resolvers';
import { orderResolvers } from '../modules/order/order.resolvers';
import { discountResolvers } from '../modules/discount/discount.resolvers';

/**
 * Custom resolver for Variant attributes
 * Converts Map to array of key-value pairs for GraphQL
 */
const variantAttributesResolver = (parent: any) => {
    if (!parent.attributes) return [];

    const attrs = parent.attributes;

    // If it's already an array, return it
    if (Array.isArray(attrs)) {
        return attrs;
    }

    // If it's a Map or object, convert to array
    if (attrs instanceof Map) {
        return Array.from(attrs.entries()).map(([key, value]) => ({
            key,
            value,
        }));
    }

    // If it's a plain object
    return Object.entries(attrs).map(([key, value]) => ({
        key,
        value: String(value),
    }));
};

/**
 * Merge all resolvers
 */
export const resolvers = {
    Query: {
        ...productResolvers.Query,
        ...cartResolvers.Query,
        ...orderResolvers.Query,
        ...discountResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...productResolvers.Mutation,
        ...cartResolvers.Mutation,
        ...orderResolvers.Mutation,
        ...discountResolvers.Mutation,
    },
    Product: {
        ...productResolvers.Product,
    },
    Variant: {
        attributes: variantAttributesResolver,
    },
};
