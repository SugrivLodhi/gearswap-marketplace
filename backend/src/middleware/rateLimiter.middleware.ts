import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimiterRes, RateLimiterAbstract } from 'rate-limiter-flexible';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { globalLimiter, authLimiter, userLimiter } from '../config/rateLimiter';
import { env } from '../config/environment';
import { RateLimitErrorBody, RateLimiterMiddlewareOptions } from '../types/rateLimiter.types';

const logger = pino({ name: 'rate-limiter' });

// ---------------------------------------------------------------------------
// Regex patterns to detect auth mutations in GraphQL request bodies
// ---------------------------------------------------------------------------

/** Matches login or register GraphQL mutations sent to /graphql */
const AUTH_MUTATION_PATTERN = /mutation[^{]*{[^}]*\b(login|register|signIn|signUp)\b/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Silently decode the JWT from the Authorization header WITHOUT verifying the
 * signature — we only need the userId for rate-limit key derivation.
 * Verification is done separately in the auth guard.
 */
function extractUserIdFromToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        const payload = jwt.decode(token) as { userId?: string; id?: string } | null;
        return payload?.userId ?? payload?.id ?? null;
    } catch {
        return null;
    }
}

/**
 * Determine the rate-limit key for a request.
 * Priority: userId from JWT → req.ip (fallback for unauthenticated requests).
 *
 * Using userId ensures the per-user limit applies consistently across
 * multiple instances and behind proxies (since req.ip is set correctly by
 * `trust proxy`).
 */
function extractIdentifier(req: Request): string {
    const userId = extractUserIdFromToken(req);
    if (userId) return `user_${userId}`;

    // req.ip is the left-most IP when trust proxy is set correctly
    return `ip_${req.ip ?? 'unknown'}`;
}

/**
 * Build the standard 429 JSON error body.
 */
function buildErrorBody(msBeforeNext: number): RateLimitErrorBody {
    const retryAfter = Math.ceil(msBeforeNext / 1000);
    return {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please retry after ${retryAfter} seconds.`,
            retryAfter,
        },
    };
}

/**
 * Set standard rate-limit informational headers on the response.
 */
function setRateLimitHeaders(res: Response, rateLimiterRes: RateLimiterRes, totalPoints: number): void {
    const resetTimeMs = new Date().getTime() + rateLimiterRes.msBeforeNext;
    res.setHeader('X-RateLimit-Limit', totalPoints);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimiterRes.remainingPoints));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTimeMs / 1000)); // Unix timestamp
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates a reusable Express middleware for a given rate limiter instance.
 *
 * @param limiter   A rate-limiter-flexible `RateLimiterAbstract` instance.
 * @param totalPoints The configured `points` value for that limiter (used for headers).
 * @param options   Middleware options (name, skip predicate, key override).
 */
export function createRateLimiterMiddleware(
    limiter: RateLimiterAbstract,
    totalPoints: number,
    options: RateLimiterMiddlewareOptions
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Skip predicate — e.g. health checks
        if (options.skip?.(req)) {
            next();
            return;
        }

        // Determine key
        const key = options.keyOverride
            ? await options.keyOverride(req)
            : extractIdentifier(req);

        try {
            const rateLimiterRes = await limiter.consume(key);
            setRateLimitHeaders(res, rateLimiterRes, totalPoints);
            next();
        } catch (err) {
            if (err instanceof RateLimiterRes) {
                // Rate limit exceeded
                const retryAfterSec = Math.ceil(err.msBeforeNext / 1000);

                logger.warn(
                    { limiter: options.name, key, retryAfterSec },
                    'Rate limit exceeded'
                );

                setRateLimitHeaders(res, err, totalPoints);
                res.setHeader('Retry-After', retryAfterSec);

                res.status(429).json(buildErrorBody(err.msBeforeNext));
            } else {
                // Unexpected error (e.g. Redis completely down and no insurance)
                logger.error(
                    { limiter: options.name, key, err },
                    'Rate limiter unexpected error — allowing request through'
                );
                // Fail-open: don't block the user on unexpected infra issues
                next();
            }
        }
    };
}

// ---------------------------------------------------------------------------
// Health-check skip predicate
// ---------------------------------------------------------------------------

const skipHealthCheck = (req: Request): boolean =>
    req.path === '/health' || req.path === '/health/';

// ---------------------------------------------------------------------------
// Auth mutation detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the GraphQL request body looks like a login/register mutation.
 * Inspects `req.body.query` (string or parsed object).
 */
const isAuthMutation = (req: Request): boolean => {
    const query: unknown = req.body?.query;
    if (typeof query !== 'string') return false;
    return AUTH_MUTATION_PATTERN.test(query);
};

// ---------------------------------------------------------------------------
// Exported middleware
// ---------------------------------------------------------------------------

/**
 * Global rate limiter — 100 req / 15 min per IP.
 * Apply this to every Express route EXCEPT /health.
 *
 * Key: IP address.
 */
export const globalRateLimiter: RequestHandler = createRateLimiterMiddleware(
    globalLimiter,
    env.rateLimitGlobalMax,
    {
        name: 'global',
        skip: skipHealthCheck,
        // Always use raw IP for the global bucket (ignores JWT userId)
        keyOverride: (req) => `ip_${req.ip ?? 'unknown'}`,
    }
);

/**
 * Auth mutation rate limiter — 5 req / 15 min per IP.
 * Apply AFTER express.json() so req.body is available.
 *
 * Key: IP address.
 * Only consumes a point when the request is a login/register mutation.
 */
export const authRateLimiter: RequestHandler = createRateLimiterMiddleware(
    authLimiter,
    env.rateLimitAuthMax,
    {
        name: 'auth',
        // Skip this limiter entirely if request is NOT an auth mutation
        skip: (req) => !isAuthMutation(req),
        keyOverride: (req) => `ip_${req.ip ?? 'unknown'}`,
    }
);

/**
 * Per-user rate limiter — 300 req / 15 min per userId.
 * For unauthenticated requests (no valid JWT), falls back to IP.
 *
 * Apply AFTER express.json() so req.body is parsed.
 */
export const userRateLimiter: RequestHandler = createRateLimiterMiddleware(
    userLimiter,
    env.rateLimitUserMax,
    {
        name: 'user',
    }
);
