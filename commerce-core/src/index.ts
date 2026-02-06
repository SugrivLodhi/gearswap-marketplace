import express from 'express';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { db } from './config/database';
import { redis } from './config/redis';
import { env } from './config/environment';
import { createContext } from './middleware/auth.guard';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

async function startServer() {
    // Connect to database
    await db.connect();

    // Create Express app
    const app = express();

    // Create Apollo Subgraph Server
    const server = new ApolloServer({
        schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
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

    // Apply middleware
    app.use(
        '/graphql',
        cors({
            origin: env.corsOrigin,
            credentials: true,
        }),
        express.json(),
        expressMiddleware(server, {
            context: createContext,
        })
    );

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check database connection
            await db.query('SELECT 1');
            // Check Redis connection
            await redis.client.ping();

            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'commerce-core',
                database: 'connected',
                redis: 'connected',
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Start server
    app.listen(env.port, () => {
        console.log(`🚀 Commerce Core Service ready at http://localhost:${env.port}/graphql`);
        console.log(`📊 Health check at http://localhost:${env.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully...');
        await db.close();
        await redis.close();
        process.exit(0);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
