import { productResolvers } from '../modules/product/product.resolvers';

export const resolvers = {
    Query: {
        ...productResolvers.Query,
    },
    Mutation: {
        ...productResolvers.Mutation,
    },
    Product: productResolvers.Product,
    Variant: productResolvers.Variant,
    User: productResolvers.User,
};
