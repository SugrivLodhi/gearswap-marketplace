import { Product, IProduct, IVariant } from './product.model';
import mongoose from 'mongoose';

export interface CreateProductInput {
    name: string;
    description: string;
    category: string;
    imageUrl: string;
    variants: IVariant[];
}

export interface UpdateProductInput {
    name?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    variants?: IVariant[];
}

export interface ProductFilters {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
}

export interface PaginationInput {
    limit?: number;
    cursor?: string; // Product ID for cursor-based pagination
}

export interface ProductConnection {
    edges: Array<{
        node: IProduct;
        cursor: string;
    }>;
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
}

class ProductService {
    /**
     * Create a new product (seller only)
     */
    async createProduct(
        sellerId: string,
        input: CreateProductInput
    ): Promise<IProduct> {
        const { name, description, category, imageUrl, variants } = input;

        // Validate variants
        if (!variants || variants.length === 0) {
            throw new Error('Product must have at least one variant');
        }

        // Check for duplicate SKUs
        const skus = variants.map((v) => v.sku);
        const uniqueSkus = new Set(skus);
        if (skus.length !== uniqueSkus.size) {
            throw new Error('Duplicate SKUs found in variants');
        }

        const product = await Product.create({
            name,
            description,
            category,
            imageUrl,
            sellerId: new mongoose.Types.ObjectId(sellerId),
            variants,
        });

        return product;
    }

    /**
     * Update product (seller only, must own the product)
     */
    async updateProduct(
        productId: string,
        sellerId: string,
        input: UpdateProductInput
    ): Promise<IProduct> {
        const product = await Product.findOne({
            _id: productId,
            sellerId: new mongoose.Types.ObjectId(sellerId),
            isDeleted: false,
        });

        if (!product) {
            throw new Error('Product not found or access denied');
        }

        // Update fields
        if (input.name) product.name = input.name;
        if (input.description) product.description = input.description;
        if (input.category) product.category = input.category;
        if (input.imageUrl) product.imageUrl = input.imageUrl;

        if (input.variants) {
            // Validate variants
            if (input.variants.length === 0) {
                throw new Error('Product must have at least one variant');
            }

            // Check for duplicate SKUs
            const skus = input.variants.map((v) => v.sku);
            const uniqueSkus = new Set(skus);
            if (skus.length !== uniqueSkus.size) {
                throw new Error('Duplicate SKUs found in variants');
            }

            product.variants = input.variants;
        }

        await product.save();
        return product;
    }

    /**
     * Soft delete product (seller only)
     */
    async deleteProduct(productId: string, sellerId: string): Promise<boolean> {
        const result = await Product.updateOne(
            {
                _id: productId,
                sellerId: new mongoose.Types.ObjectId(sellerId),
                isDeleted: false,
            },
            { isDeleted: true }
        );

        if (result.modifiedCount === 0) {
            throw new Error('Product not found or access denied');
        }

        return true;
    }

    /**
     * Get product by ID (public)
     */
    async getProductById(productId: string): Promise<IProduct | null> {
        return Product.findOne({ _id: productId, isDeleted: false }).populate(
            'sellerId',
            'email'
        );
    }

    /**
     * List products with filters and pagination (public)
     */
    async listProducts(
        filters: ProductFilters = {},
        pagination: PaginationInput = {}
    ): Promise<ProductConnection> {
        const { search, category, minPrice, maxPrice, sellerId } = filters;
        const { limit = 20, cursor } = pagination;

        // Build query
        const query: any = { isDeleted: false };

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Seller filter
        if (sellerId) {
            query.sellerId = new mongoose.Types.ObjectId(sellerId);
        }

        // Price filter (check if any variant matches)
        if (minPrice !== undefined || maxPrice !== undefined) {
            const priceConditions: any = {};
            if (minPrice !== undefined) priceConditions.$gte = minPrice;
            if (maxPrice !== undefined) priceConditions.$lte = maxPrice;

            query['variants.price'] = priceConditions;
        }

        // Cursor-based pagination
        if (cursor) {
            query._id = { $gt: new mongoose.Types.ObjectId(cursor) };
        }

        // Execute query
        const products = await Product.find(query)
            .sort({ _id: 1 })
            .limit(limit + 1) // Fetch one extra to check if there's a next page
            .populate('sellerId', 'email');

        // Determine if there's a next page
        const hasNextPage = products.length > limit;
        const nodes = hasNextPage ? products.slice(0, limit) : products;

        // Build edges
        const edges = nodes.map((node) => ({
            node,
            cursor: node._id.toString(),
        }));

        return {
            edges,
            pageInfo: {
                hasNextPage,
                endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            },
        };
    }

    /**
     * Get variant by SKU
     */
    async getVariantBySku(
        productId: string,
        variantId: string
    ): Promise<{ product: IProduct; variant: IVariant } | null> {
        const product = await Product.findOne({
            _id: productId,
            isDeleted: false,
        });

        if (!product) {
            return null;
        }

        const variant = product.variants.find(
            (v) => v._id?.toString() === variantId
        );

        if (!variant) {
            return null;
        }

        return { product, variant };
    }

    /**
     * Update variant stock (used during checkout)
     */
    async updateVariantStock(
        productId: string,
        variantId: string,
        quantityChange: number
    ): Promise<void> {
        const product = await Product.findOne({
            _id: productId,
            isDeleted: false,
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const variant = product.variants.find(
            (v) => v._id?.toString() === variantId
        );

        if (!variant) {
            throw new Error('Variant not found');
        }

        const newStock = variant.stock + quantityChange;
        if (newStock < 0) {
            throw new Error('Insufficient stock');
        }

        variant.stock = newStock;
        await product.save();
    }
}

export const productService = new ProductService();
