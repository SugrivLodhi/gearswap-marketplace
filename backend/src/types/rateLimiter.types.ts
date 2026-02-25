import { Request } from 'express';

/**
 * Rate limit info attached to every request that passes through the limiter.
 */
export interface RateLimitInfo {
    /** Configured maximum requests per window */
    limit: number;
    /** Remaining requests in the current window */
    remaining: number;
    /** Timestamp when the current window resets */
    resetTime: Date;
}

/**
 * JSON body returned to the client on 429 Too Many Requests.
 */
export interface RateLimitErrorBody {
    success: false;
    error: {
        code: 'RATE_LIMIT_EXCEEDED';
        message: string;
        /** Seconds until the client may retry */
        retryAfter: number;
    };
}

/**
 * Options accepted by `createRateLimiterMiddleware()`.
 */
export interface RateLimiterMiddlewareOptions {
    /**
     * Human-readable name used in log messages (e.g. "global", "auth", "user").
     */
    name: string;
    /**
     * Skip rate limiting for this request if the function returns true.
     * Useful for health-check bypasses.
     */
    skip?: (req: Request) => boolean;
    /**
     * Override the key used for this request.
     * If omitted, the middleware derives the key automatically (userId → IP).
     */
    keyOverride?: (req: Request) => string | Promise<string>;
}
