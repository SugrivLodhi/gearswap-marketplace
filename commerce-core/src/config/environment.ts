import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: parseInt(process.env.PORT || '4001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://gearswap:gearswap_password@localhost:5432/commerce_core',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:4002/graphql',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
