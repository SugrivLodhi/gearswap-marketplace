import { GraphQLContext, requireSeller } from '../../middleware/auth.guard';
import {
    productService,
    CreateProductInput,
    UpdateProductInput,
    ProductFilters,
    PaginationInput,
} from './product.service';

export const productResolvers = {
    Query: {
        // Public: Get product by ID
        product: async (_: any, { id }: { id: string }) => {
            const product = await productService.getProductById(id);
            if (!product) {
                throw new Error('Product not found');
            }
            return product;
        },

        // Public: List products with filters and pagination
        products: async (
            _: any,
            {
                filters,
                pagination,
            }: {
                filters?: ProductFilters;
                pagination?: PaginationInput;
            }
        ) => {
            return productService.listProducts(filters, pagination);
        },
    },

    Mutation: {
        // Seller only: Create product
        createProduct: async (
            _: any,
            { input }: { input: CreateProductInput },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return productService.createProduct(user.userId, input);
        },

        // Seller only: Update product
        updateProduct: async (
            _: any,
            { id, input }: { id: string; input: UpdateProductInput },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return productService.updateProduct(id, user.userId, input);
        },

        // Seller only: Delete product
        deleteProduct: async (
            _: any,
            { id }: { id: string },
            context: GraphQLContext
        ) => {
            const user = requireSeller(context);
            return productService.deleteProduct(id, user.userId);
        },
    },

    Product: {
        // Resolve seller field
        seller: async (parent: any) => {
            return parent.sellerId;
        },
    },
};
