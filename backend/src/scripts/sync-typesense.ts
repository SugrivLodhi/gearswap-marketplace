import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { Product } from '../modules/product/product.model';
import {
    typesenseClient,
    PRODUCTS_COLLECTION_NAME,
    productsSchema,
    initTypesense,
    formatProductForTypesense,
} from '../utils/typesense';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gearswap';

async function syncTypesense() {
    try {
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        logger.info('Connected to MongoDB.');

        // 1. Re-create the collection
        logger.info('Checking if Typesense collection exists...');
        try {
            await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).retrieve();
            logger.info('Deleting existing Typesense collection...');
            await typesenseClient.collections(PRODUCTS_COLLECTION_NAME).delete();
        } catch (error) {
            // Retrieve throws an error if the collection doesn't exist, which is fine
        }

        logger.info(`Creating Typesense collection: ${PRODUCTS_COLLECTION_NAME}...`);
        await typesenseClient.collections().create(productsSchema);
        logger.info('Typesense collection created successfully.');

        // 2. Fetch all non-deleted products
        logger.info('Fetching products from MongoDB...');
        const products = await Product.find({ isDeleted: false });
        logger.info(`Found ${products.length} products to index.`);

        if (products.length === 0) {
            logger.info('No products to index. Exiting.');
            process.exit(0);
        }

        // 3. Format and index in batches
        const documents = products.map(formatProductForTypesense);

        logger.info('Indexing products into Typesense...');
        const results = await typesenseClient
            .collections(PRODUCTS_COLLECTION_NAME)
            .documents()
            .import(documents, { action: 'upsert' });

        const failedItems = results.filter((res: any) => res.success === false);

        if (failedItems.length > 0) {
            logger.error({ failedItems }, `Failed to index ${failedItems.length} items.`);
        } else {
            logger.info('All products successfully indexed into Typesense!');
        }

    } catch (error) {
        logger.error({ err: error }, 'Failed to sync Typesense');
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB.');
        process.exit(0);
    }
}

syncTypesense();
