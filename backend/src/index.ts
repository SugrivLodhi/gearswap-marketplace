import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { connectDatabase } from './config/database';
import { env } from './config/environment';
import { createContext } from './middleware/auth.guard';
import {
    globalRateLimiter,
    authRateLimiter,
    userRateLimiter,
} from './middleware/rateLimiter.middleware';
import { createBullBoardAdapter } from './config/bullboard';

// Force restart: schema update
async function startServer() {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = express();

    // -------------------------------------------------------------------------
    // Trust proxy — MUST be set before any middleware that reads req.ip.
    // Value `1` means trust the first proxy hop (e.g. Nginx).
    // Ensures req.ip contains the real client IP, not the proxy IP.
    // -------------------------------------------------------------------------
    app.set('trust proxy', 1);

    // -------------------------------------------------------------------------
    // Global rate limiter — applied to ALL routes (health check is skipped
    // inside the middleware via its `skip` predicate).
    // -------------------------------------------------------------------------
    app.use(globalRateLimiter);

    // -------------------------------------------------------------------------
    // Bull Board — Queue monitoring dashboard at /admin/queues
    // Must be mounted AFTER trust proxy but BEFORE GraphQL middleware.
    // No rate limiting on this route (internal tooling only).
    // -------------------------------------------------------------------------
    const bullBoardAdapter = createBullBoardAdapter();
    app.use('/admin/queues', bullBoardAdapter.getRouter());

    // Health check — no rate limit, no auth, no JSON body parsing needed
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Create Apollo Server
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (error) => {
            console.error('GraphQL Error:', error);
            return {
                message: error.message,
                extensions: {
                    code: error.extensions?.code,
                },
            };
        },
    });

    // Start Apollo Server
    await server.start();

    // -------------------------------------------------------------------------
    // GraphQL endpoint middleware stack (order matters):
    //   1. CORS
    //   2. JSON body parser — must come BEFORE rate limiters that inspect req.body
    //   3. authRateLimiter — strict IP-based limit for login/register mutations (5/15m)
    //   4. userRateLimiter — per-userId (or IP fallback) limit (300/15m)
    //   5. Apollo expressMiddleware
    // -------------------------------------------------------------------------
    app.use(
        '/graphql',
        cors({
            origin: env.corsOrigin,
            credentials: true,
        }),
        express.json(),
        authRateLimiter,
        userRateLimiter,
        expressMiddleware(server, {
            context: createContext,
        })
    );

    // Start server
    app.listen(env.port, () => {
        console.log(`🚀 Server ready at http://localhost:${env.port}/graphql`);
        console.log(`📊 Health check at http://localhost:${env.port}/health`);
        console.log(`🛡️  Rate limiting active (global: ${env.rateLimitGlobalMax} req/${env.rateLimitGlobalWindow}s)`);
        console.log(`📋 Bull Board dashboard at http://localhost:${env.port}/admin/queues`);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
