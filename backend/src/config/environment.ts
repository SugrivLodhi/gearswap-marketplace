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
    // Rate Limiting
    rateLimitGlobalMax: number;
    rateLimitGlobalWindow: number;
    rateLimitAuthMax: number;
    rateLimitAuthWindow: number;
    rateLimitUserMax: number;
    rateLimitUserWindow: number;
    rateLimitSkipOnRedisError: boolean;
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
    // Rate Limiting — all optional with production-safe defaults
    rateLimitGlobalMax: parseInt(getEnvVariable('RATE_LIMIT_GLOBAL_MAX', '100'), 10),
    rateLimitGlobalWindow: parseInt(getEnvVariable('RATE_LIMIT_GLOBAL_WINDOW', '900'), 10),
    rateLimitAuthMax: parseInt(getEnvVariable('RATE_LIMIT_AUTH_MAX', '5'), 10),
    rateLimitAuthWindow: parseInt(getEnvVariable('RATE_LIMIT_AUTH_WINDOW', '900'), 10),
    rateLimitUserMax: parseInt(getEnvVariable('RATE_LIMIT_USER_MAX', '300'), 10),
    rateLimitUserWindow: parseInt(getEnvVariable('RATE_LIMIT_USER_WINDOW', '900'), 10),
    rateLimitSkipOnRedisError: getEnvVariable('RATE_LIMIT_SKIP_ON_REDIS_ERROR', 'true') === 'true',
};
