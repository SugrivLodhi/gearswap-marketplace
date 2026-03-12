import { Client } from 'typesense';
import dotenv from 'dotenv';
import { logger } from './logger';
import { IProduct } from '../modules/product/product.model';

dotenv.config();

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || 'localhost';
const TYPESENSE_PORT = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || 'typesense-secret-key-gearswap';

export const typesenseClient = new Client({
    nodes: [
        {
            host: TYPESENSE_HOST,
            port: TYPESENSE_PORT,
            protocol: TYPESENSE_PROTOCOL,
        },
    ],
    apiKey: TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 5,
});

export const PRODUCTS_COLLECTION_NAME = 'products';

export const productsSchema: any = {
    name: PRODUCTS_COLLECTION_NAME,
    fields: [
        { name: '.*', type: 'auto' }, // Automatically infer types for unspecified fields
        { name: 'name', type: 'string', facet: true },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string', facet: true },
        { name: 'sellerId', type: 'string', facet: true },
        { name: 'prices', type: 'float[]', facet: true }, // Array of variant prices
    ],
};

/**
 * Format a Mongoose Product document for Typesense indexing
 */
export const formatProductForTypesense = (product: IProduct) => {
    return {
        id: product._id.toString(), // Typesense requires a string `id` field
        name: product.name,
        description: product.description,
        category: product.category,
        sellerId: product.sellerId.toString(),
        prices: product.variants.map((v) => v.price),
        imageUrl: product.imageUrl,
    };
};

/**
 * Initialize Typesense collections
 */
export const initTypesense = async () => {
    try {
        const collections = await typesenseClient.collections().retrieve();
        const collectionExists = collections.some(
            (c) => c.name === PRODUCTS_COLLECTION_NAME
        );

        if (!collectionExists) {
            logger.info(`Creating Typesense collection: ${PRODUCTS_COLLECTION_NAME}`);
            await typesenseClient.collections().create(productsSchema);
            logger.info('Typesense collection created successfully.');
        } else {
            logger.info(`Typesense collection ${PRODUCTS_COLLECTION_NAME} already exists.`);
        }
    } catch (error) {
        logger.error({ err: error }, 'Failed to initialize Typesense collection');
    }
};

/**
 * Upsert a product into Typesense
 */
export const upsertProductInTypesense = async (product: IProduct) => {
    try {
        const document = formatProductForTypesense(product);
        await typesenseClient
            .collections(PRODUCTS_COLLECTION_NAME)
            .documents()
            .upsert(document);
    } catch (error) {
        logger.error({ err: error, productId: product._id }, 'Failed to upsert product in Typesense');
    }
};

/**
 * Delete a product from Typesense
 */
export const deleteProductFromTypesense = async (productId: string) => {
    try {
        await typesenseClient
            .collections(PRODUCTS_COLLECTION_NAME)
            .documents(productId)
            .delete();
    } catch (error) {
        logger.error({ err: error, productId }, 'Failed to delete product from Typesense');
    }
};
