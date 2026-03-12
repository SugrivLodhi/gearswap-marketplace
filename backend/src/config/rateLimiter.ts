import { RateLimiterRedis, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import { getRedisConnection } from './redis';
import { env } from './environment';

/**
 * Shared rate limiter instances.
 *
 * We create a dedicated IORedis client for rate limiting that does NOT have
 * `maxRetriesPerRequest: null` — that setting is BullMQ-specific and would
 * cause unexpected blocking behaviour in rate limiters.
 *
 * Instead we reuse the same singleton connection from getRedisConnection()
 * since rate-limiter-flexible only needs standard ioredis commands (EVAL, EXPIRE, GET).
 */

// ---------------------------------------------------------------------------
// Insurance limiters (in-memory fallback when Redis is unavailable)
// ---------------------------------------------------------------------------

/** In-memory fallback for global limiter — keeps the API up during Redis outages */
const globalInsurance = new RateLimiterMemory({
    keyPrefix: 'rl_global_ins',
    points: env.rateLimitGlobalMax,
    duration: env.rateLimitGlobalWindow,
});

/** In-memory fallback for auth limiter */
const authInsurance = new RateLimiterMemory({
    keyPrefix: 'rl_auth_ins',
    points: env.rateLimitAuthMax,
    duration: env.rateLimitAuthWindow,
});

/** In-memory fallback for user limiter */
const userInsurance = new RateLimiterMemory({
    keyPrefix: 'rl_user_ins',
    points: env.rateLimitUserMax,
    duration: env.rateLimitUserWindow,
});

// ---------------------------------------------------------------------------
// Primary Redis-backed sliding window limiters
// ---------------------------------------------------------------------------

/**
 * Global rate limiter — applied to every IP address.
 * Limit: 100 requests / 15 minutes (configurable via env).
 *
 * Uses `useRedisPackage: true` so rate-limiter-flexible works with ioredis
 * (the default expects the `redis` npm package).
 */
export const globalLimiter: RateLimiterAbstract = new RateLimiterRedis({
    storeClient: getRedisConnection(),
    useRedisPackage: true,
    keyPrefix: 'rl_global',
    points: env.rateLimitGlobalMax,
    duration: env.rateLimitGlobalWindow,
    // Sliding window: each point expires individually
    blockDuration: 0,
    insuranceLimiter: env.rateLimitSkipOnRedisError ? globalInsurance : undefined,
});

/**
 * Auth route limiter — strict per-IP limit for login/register mutations.
 * Limit: 5 requests / 15 minutes (configurable via env).
 *
 * Deliberately IP-based (not userId-based) to protect against credential
 * stuffing even before a valid user token exists.
 */
export const authLimiter: RateLimiterAbstract = new RateLimiterRedis({
    storeClient: getRedisConnection(),
    useRedisPackage: true,
    keyPrefix: 'rl_auth',
    points: env.rateLimitAuthMax,
    duration: env.rateLimitAuthWindow,
    blockDuration: 0,
    insuranceLimiter: env.rateLimitSkipOnRedisError ? authInsurance : undefined,
});

/**
 * Per-user rate limiter — applied to authenticated requests using userId from JWT.
 * Limit: 300 requests / 15 minutes (configurable via env).
 *
 * Higher than global because authenticated users have a known identity and
 * legitimate use-cases (e.g., dashboard polling) can be more intense.
 */
export const userLimiter: RateLimiterAbstract = new RateLimiterRedis({
    storeClient: getRedisConnection(),
    useRedisPackage: true,
    keyPrefix: 'rl_user',
    points: env.rateLimitUserMax,
    duration: env.rateLimitUserWindow,
    blockDuration: 0,
    insuranceLimiter: env.rateLimitSkipOnRedisError ? userInsurance : undefined,
});
