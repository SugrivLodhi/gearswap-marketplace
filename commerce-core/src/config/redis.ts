import Redis from 'ioredis';
import { env } from './environment';

class RedisClient {
    public client: Redis;
    public subscriber: Redis;
    public publisher: Redis;

    constructor() {
        // Main Redis client for caching
        this.client = new Redis(env.redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        // Subscriber client for Pub/Sub
        this.subscriber = new Redis(env.redisUrl);

        // Publisher client for Pub/Sub
        this.publisher = new Redis(env.redisUrl);

        this.client.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis connection error:', err);
        });
    }

    async get(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.client.setex(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async delPattern(pattern: string): Promise<void> {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }

    async publish(channel: string, message: string): Promise<void> {
        await this.publisher.publish(channel, message);
    }

    async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, msg) => {
            if (ch === channel) {
                callback(msg);
            }
        });
    }

    async close(): Promise<void> {
        await this.client.quit();
        await this.subscriber.quit();
        await this.publisher.quit();
        console.log('Redis connections closed');
    }
}

export const redis = new RedisClient();
