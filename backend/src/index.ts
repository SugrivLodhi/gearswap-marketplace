import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { connectDatabase } from './config/database';
import { env } from './config/environment';
import { createContext } from './middleware/auth.guard';

async function startServer() {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = express();

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
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Start server
    app.listen(env.port, () => {
        console.log(`🚀 Server ready at http://localhost:${env.port}/graphql`);
        console.log(`📊 Health check at http://localhost:${env.port}/health`);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
