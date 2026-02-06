import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    commerceCoreUrl: process.env.COMMERCE_CORE_URL || 'http://localhost:4001/graphql',
    catalogSearchUrl: process.env.CATALOG_SEARCH_URL || 'http://localhost:4002/graphql',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
