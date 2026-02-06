import { authResolvers } from '../modules/auth/auth.resolvers';
import { cartResolvers } from '../modules/cart/cart.resolvers';
import { orderResolvers } from '../modules/order/order.resolvers';
import { discountResolvers } from '../modules/discount/discount.resolvers';

// Merge all resolvers
export const resolvers = {
    Query: {
        ...authResolvers.Query,
        ...cartResolvers.Query,
        ...orderResolvers.Query,
        ...discountResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...cartResolvers.Mutation,
        ...orderResolvers.Mutation,
        ...discountResolvers.Mutation,
    },
    User: authResolvers.User,
    Cart: cartResolvers.Cart,
    CartItem: cartResolvers.CartItem,
    Product: cartResolvers.Product,
    Order: orderResolvers.Order,
    OrderItem: orderResolvers.OrderItem,
};
