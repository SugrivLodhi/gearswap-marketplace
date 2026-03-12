/**
 * Unit tests for rateLimiter.middleware.ts
 *
 * Redis is fully mocked — no Redis server required to run these tests.
 * We mock `rate-limiter-flexible` to control limit/exceed scenarios.
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRes } from 'rate-limiter-flexible';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the config/rateLimiter module so no Redis connection is attempted
jest.mock('../src/config/rateLimiter', () => {
    const mockConsume = jest.fn();
    const mockLimiter = { consume: mockConsume };
    return {
        globalLimiter: mockLimiter,
        authLimiter: mockLimiter,
        userLimiter: mockLimiter,
        _mockConsume: mockConsume, // Expose for test control
    };
});

// Mock environment with deterministic values
jest.mock('../src/config/environment', () => ({
    env: {
        rateLimitGlobalMax: 100,
        rateLimitGlobalWindow: 900,
        rateLimitAuthMax: 5,
        rateLimitAuthWindow: 900,
        rateLimitUserMax: 300,
        rateLimitUserWindow: 900,
        rateLimitSkipOnRedisError: true,
        jwtSecret: 'test-secret',
    },
}));

// Mock redis connection so it's never actually called
jest.mock('../src/config/redis', () => ({
    getRedisConnection: jest.fn(() => ({})),
}));

import {
    createRateLimiterMiddleware,
    globalRateLimiter,
    authRateLimiter,
    userRateLimiter,
} from '../src/middleware/rateLimiter.middleware';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { globalLimiter, _mockConsume: mockConsume } = require('../src/config/rateLimiter');

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

function buildReq(overrides: Partial<Request> = {}): Request {
    return {
        headers: {},
        path: '/graphql',
        ip: '127.0.0.1',
        body: {},
        ...overrides,
    } as unknown as Request;
}

function buildRes(): { res: Response; json: jest.Mock; status: jest.Mock; setHeader: jest.Mock } {
    const json = jest.fn().mockReturnThis();
    const setHeader = jest.fn().mockReturnThis();
    const status = jest.fn().mockReturnValue({ json });
    const res = { json, status, setHeader } as unknown as Response;
    return { res, json, status, setHeader };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRateLimiterMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // 1. Happy path — request passes through when under the limit
    // -------------------------------------------------------------------------
    it('calls next() when the rate limit is not exceeded', async () => {
        mockConsume.mockResolvedValueOnce(
            new RateLimiterRes(99, 89_000, 0, undefined)
        );

        const middleware = createRateLimiterMiddleware(globalLimiter, 100, { name: 'test' });
        const req = buildReq();
        const { res } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // 2. Rate limit exceeded — returns 429 with proper body
    // -------------------------------------------------------------------------
    it('returns 429 with correct JSON body when limit is exceeded', async () => {
        // Simulating a limit exceeded: throw a RateLimiterRes
        const exceededError = new RateLimiterRes(0, 60_000, 0, undefined);
        mockConsume.mockRejectedValueOnce(exceededError);

        const middleware = createRateLimiterMiddleware(globalLimiter, 100, { name: 'test' });
        const req = buildReq();
        const { res, status, json } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(429);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: 60,
                }),
            })
        );
    });

    // -------------------------------------------------------------------------
    // 3. Retry-After header is set in seconds
    // -------------------------------------------------------------------------
    it('sets Retry-After header in seconds on 429 responses', async () => {
        const msBeforeNext = 30_000; // 30 seconds
        mockConsume.mockRejectedValueOnce(new RateLimiterRes(0, msBeforeNext, 0, undefined));

        const middleware = createRateLimiterMiddleware(globalLimiter, 100, { name: 'test' });
        const req = buildReq();
        const { res, setHeader } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        expect(setHeader).toHaveBeenCalledWith('Retry-After', 30);
    });

    // -------------------------------------------------------------------------
    // 4. Redis failure — allows request through (fail-open)
    // -------------------------------------------------------------------------
    it('calls next() when Redis throws an unexpected error (fail-open)', async () => {
        mockConsume.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const middleware = createRateLimiterMiddleware(globalLimiter, 100, { name: 'test' });
        const req = buildReq();
        const { res } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        // Must pass through — never block users on infra failure
        expect(next).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // 5. Health check bypass — skip predicate stops the middleware from consuming
    // -------------------------------------------------------------------------
    it('skips rate limiting for /health endpoint', async () => {
        const middleware = createRateLimiterMiddleware(globalLimiter, 100, {
            name: 'global',
            skip: (req) => req.path === '/health',
        });

        const req = buildReq({ path: '/health' } as Partial<Request>);
        const { res } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        // consume should never be called for health checks
        expect(mockConsume).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // 6. X-RateLimit-* headers are set on successful pass-through
    // -------------------------------------------------------------------------
    it('sets X-RateLimit-* headers on allowed requests', async () => {
        mockConsume.mockResolvedValueOnce(
            new RateLimiterRes(50, 45_000, 0, undefined)
        );

        const middleware = createRateLimiterMiddleware(globalLimiter, 100, { name: 'test' });
        const req = buildReq();
        const { res, setHeader } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await middleware(req, res, next);

        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 50);
        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    // -------------------------------------------------------------------------
    // 7. Auth mutation detection — limiter is skipped for non-auth queries
    // -------------------------------------------------------------------------
    it('skips authRateLimiter for non-auth GraphQL queries', async () => {
        const req = buildReq({
            body: { query: 'query { products { id } }' },
        } as Partial<Request>);
        const { res } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await authRateLimiter(req, res, next);

        // consume should NOT be called — not an auth mutation
        expect(mockConsume).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    // -------------------------------------------------------------------------
    // 8. Auth mutation detection — limiter IS applied for login mutations
    // -------------------------------------------------------------------------
    it('applies authRateLimiter for login GraphQL mutations', async () => {
        const exceededError = new RateLimiterRes(0, 15 * 60 * 1000, 0, undefined);
        mockConsume.mockRejectedValueOnce(exceededError);

        const req = buildReq({
            ip: '10.0.0.1',
            body: { query: 'mutation { login(input: {email: "x", password: "y"}) { token } }' },
        } as Partial<Request>);
        const { res, status } = buildRes();
        const next = jest.fn() as unknown as NextFunction;

        await authRateLimiter(req, res, next);

        expect(mockConsume).toHaveBeenCalledTimes(1);
        expect(status).toHaveBeenCalledWith(429);
    });
});
