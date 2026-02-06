import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: parseInt(process.env.PORT || '4002', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gearswap',
    elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    commerceCoreUrl: process.env.COMMERCE_CORE_URL || 'http://localhost:4001/graphql',
};
