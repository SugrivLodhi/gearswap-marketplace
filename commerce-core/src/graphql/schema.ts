import { authTypeDefs } from '../modules/auth/auth.schema';
import { cartTypeDefs } from '../modules/cart/cart.schema';
import { orderTypeDefs } from '../modules/order/order.schema';
import { discountTypeDefs } from '../modules/discount/discount.schema';

// Combine all type definitions
export const typeDefs = [
    authTypeDefs,
    cartTypeDefs,
    orderTypeDefs,
    discountTypeDefs,
];
