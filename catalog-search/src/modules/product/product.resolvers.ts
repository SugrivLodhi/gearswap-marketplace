import { productService } from './product.service';

export const productResolvers = {
    Query: {
        product: async (_: any, { id }: any) => {
            const product = await productService.getProductById(id);
            if (!product) {
                throw new Error('Product not found');
            }
            return product;
        },

        products: async (_: any, { filters, pagination }: any) => {
            return await productService.listProducts(filters, pagination);
        },
    },

    Mutation: {
        createProduct: async (_: any, { input }: any, context: any) => {
            // Check if user is authenticated and is a seller
            if (!context.user) {
                throw new Error('Authentication required');
            }
            if (context.user.role !== 'SELLER') {
                throw new Error('Only sellers can create products');
            }

            return await productService.createProduct(context.user.userId, input);
        },

        updateProduct: async (_: any, { id, input }: any, context: any) => {
            if (!context.user) {
                throw new Error('Authentication required');
            }
            if (context.user.role !== 'SELLER') {
                throw new Error('Only sellers can update products');
            }

            return await productService.updateProduct(id, context.user.userId, input);
        },

        deleteProduct: async (_: any, { id }: any, context: any) => {
            if (!context.user) {
                throw new Error('Authentication required');
            }
            if (context.user.role !== 'SELLER') {
                throw new Error('Only sellers can delete products');
            }

            return await productService.deleteProduct(id, context.user.userId);
        },
    },

    Product: {
        __resolveReference: async (reference: { id: string }) => {
            return await productService.getProductById(reference.id);
        },

        id: (product: any) => product._id.toString(),

        seller: (product: any) => {
            // Return reference to User type - Commerce Core will resolve full details
            return { __typename: 'User', id: product.sellerId.toString() };
        },

        variants: (product: any) => {
            return product.variants.map((v: any) => ({
                ...v,
                id: v._id.toString(),
                attributes: Array.from(v.attributes || new Map()).map(([key, value]) => ({
                    key,
                    value,
                })),
            }));
        },

        createdAt: (product: any) => product.createdAt.toISOString(),
        updatedAt: (product: any) => product.updatedAt.toISOString(),
    },

    Variant: {
        id: (variant: any) => variant._id?.toString() || variant.id,
    },

    User: {
        __resolveReference: (reference: { id: string }) => {
            // Return reference - Commerce Core will resolve full details
            return { __typename: 'User', id: reference.id };
        },
    },
};
