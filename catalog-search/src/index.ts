import express from 'express';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { connectDatabase, mongoose } from './config/database';
import { elasticsearch } from './config/elasticsearch';
import { env } from './config/environment';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

async function startServer() {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Elasticsearch and create index
    await elasticsearch.connect();
    await elasticsearch.createProductIndex();

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
        cors(),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                const context: any = {
                    headers: req.headers,
                };

                // Extract token from Authorization header
                const authHeader = req.headers.authorization || '';
                const token = authHeader.replace('Bearer ', '');

                if (token) {
                    try {
                        // Verify token by calling Commerce Core service
                        const response = await fetch(env.commerceCoreUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                query: '{ me { id email role } }',
                            }),
                        });

                        const result = await response.json();
                        if (result.data?.me) {
                            context.user = {
                                userId: result.data.me.id,
                                email: result.data.me.email,
                                role: result.data.me.role,
                            };
                        }
                    } catch (error) {
                        console.warn('Token verification failed:', error);
                    }
                }

                return context;
            },
        })
    );

    // Health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check MongoDB connection
            await mongoose.connection.db.admin().ping();
            // Check Elasticsearch connection
            await elasticsearch.client.ping();

            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'catalog-search',
                mongodb: 'connected',
                elasticsearch: 'connected',
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
        console.log(`🚀 Catalog & Search Service ready at http://localhost:${env.port}/graphql`);
        console.log(`📊 Health check at http://localhost:${env.port}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, shutting down gracefully...');
        await mongoose.connection.close();
        await elasticsearch.close();
        process.exit(0);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
