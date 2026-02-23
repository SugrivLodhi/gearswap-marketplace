import dotenv from 'dotenv';

dotenv.config();

interface Environment {
    port: number;
    nodeEnv: string;
    mongodbUri: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    corsOrigin: string;
    // Redis
    redisHost: string;
    redisPort: number;
    redisPassword: string | undefined;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const env: Environment = {
    port: parseInt(getEnvVariable('PORT', '4000'), 10),
    nodeEnv: getEnvVariable('NODE_ENV', 'development'),
    mongodbUri: getEnvVariable('MONGODB_URI'),
    jwtSecret: getEnvVariable('JWT_SECRET'),
    jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN', '7d'),
    corsOrigin: getEnvVariable('CORS_ORIGIN', 'http://localhost:3000'),
    // Redis
    redisHost: getEnvVariable('REDIS_HOST', 'localhost'),
    redisPort: parseInt(getEnvVariable('REDIS_PORT', '6379'), 10),
    redisPassword: process.env['REDIS_PASSWORD'] || undefined,
};
