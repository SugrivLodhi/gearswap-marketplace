import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import cors from 'cors';
import { config } from './config/environment';

async function startGateway() {
    const app = express();

    // Create Apollo Gateway with Federation
    const gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
            subgraphs: [
                {
                    name: 'commerce-core',
                    url: config.commerceCoreUrl,
                },
                {
                    name: 'catalog-search',
                    url: config.catalogSearchUrl,
                },
            ],
            // Poll for schema updates every 10 seconds
            pollIntervalInMs: 10000,
        }),
    });

    // Create Apollo Server with Gateway
    const server = new ApolloServer({
        gateway,
        // Disable subscriptions (not supported in gateway mode)
        // subscriptions: false is default in Apollo Server 4
    });

    await server.start();

    // Apply middleware
    app.use(
        '/graphql',
        cors({
            origin: config.corsOrigin,
            credentials: true,
        }),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                // Forward authorization header to subgraphs
                return {
                    headers: req.headers,
                };
            },
        })
    );

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                commerceCore: config.commerceCoreUrl,
                catalogSearch: config.catalogSearchUrl,
            },
        });
    });

    // Start server
    app.listen(config.port, () => {
        console.log(`🚀 Gateway ready at http://localhost:${config.port}/graphql`);
        console.log(`📊 Health check at http://localhost:${config.port}/health`);
        console.log(`🔗 Commerce Core: ${config.commerceCoreUrl}`);
        console.log(`🔗 Catalog Search: ${config.catalogSearchUrl}`);
    });
}

// Start the gateway
startGateway().catch((error) => {
    console.error('Failed to start gateway:', error);
    process.exit(1);
});
