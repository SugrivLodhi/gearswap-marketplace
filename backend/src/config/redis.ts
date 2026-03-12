import IORedis from 'ioredis';
import { env } from './environment';

let redisInstance: IORedis | null = null;

/**
 * Returns a singleton IORedis connection configured for BullMQ.
 * BullMQ requires `maxRetriesPerRequest: null` on the client it receives.
 */
export function getRedisConnection(): IORedis {
    if (redisInstance) {
        return redisInstance;
    }

    redisInstance = new IORedis({
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword,
        // Required by BullMQ — allows commands to block until Redis is ready
        maxRetriesPerRequest: null,
        // Reconnect with exponential backoff (up to 10s)
        retryStrategy: (times: number) => {
            const delay = Math.min(times * 200, 10_000);
            return delay;
        },
        enableReadyCheck: false,
        lazyConnect: false,
    });

    redisInstance.on('connect', () => {
        console.log('✅ Redis connected');
    });

    redisInstance.on('ready', () => {
        console.log('🚀 Redis ready');
    });

    redisInstance.on('error', (err: Error) => {
        console.error('❌ Redis error:', err.message);
    });

    redisInstance.on('close', () => {
        console.warn('⚠️  Redis connection closed');
    });

    redisInstance.on('reconnecting', () => {
        console.warn('🔄 Redis reconnecting...');
    });

    return redisInstance;
}

/**
 * Gracefully close the Redis connection.
 * Call during process shutdown after workers have drained.
 */
export async function closeRedisConnection(): Promise<void> {
    if (redisInstance) {
        await redisInstance.quit();
        redisInstance = null;
        console.log('✅ Redis connection closed gracefully');
    }
}
