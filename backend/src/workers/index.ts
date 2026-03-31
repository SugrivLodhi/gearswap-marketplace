/**
 * Worker Process Entry Point
 *
 * Run this as a SEPARATE Node.js process from the main API server:
 *   Development:  npm run worker:dev
 *   Production:   npm run worker:start
 *
 * This separation means:
 *  - The API server and workers can scale independently
 *  - A crashing worker never takes down the API
 *  - Workers can be redeployed without API downtime
 */

import dotenv from 'dotenv';
dotenv.config(); // must run before importing env/config

import { connectDatabase } from '../config/database';
import { closeRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import { createEmailWorker } from './email.worker';
import { createRecommendationWorker } from './recommendation.worker';

async function startWorkers(): Promise<void> {
    // Connect to MongoDB in case workers need to query the DB
    await connectDatabase();

    // Instantiate all workers
    const emailWorker = createEmailWorker(
        parseInt(process.env['WORKER_EMAIL_CONCURRENCY'] ?? '5', 10)
    );
    
    const recommendationWorker = createRecommendationWorker(
        parseInt(process.env['WORKER_RECOMMENDATION_CONCURRENCY'] ?? '2', 10)
    );

    logger.info('🏭 All workers started — waiting for jobs...');

    // ─── Graceful Shutdown ─────────────────────────────────────────────────
    // On SIGTERM or SIGINT:
    //   1. Stop accepting new jobs
    //   2. Let in-flight jobs drain
    //   3. Close Redis + DB connections

    const shutdown = async (signal: string): Promise<void> => {
        logger.info(`🛑 Received ${signal} — shutting down workers gracefully`);

        try {
            // Worker.close() drains in-flight jobs before resolving
            await emailWorker.close();
            logger.info('✅ Email worker closed');
            
            await recommendationWorker.close();
            logger.info('✅ Recommendation worker closed');

            await closeRedisConnection();
            logger.info('✅ Graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error({ err }, '❌ Error during shutdown');
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    process.on('SIGINT', () => { void shutdown('SIGINT'); });

    // Catch unhandled promise rejections to prevent silent failures
    process.on('unhandledRejection', (reason) => {
        logger.error({ reason }, '💥 Unhandled promise rejection in worker process');
    });
}

// Boot
startWorkers().catch((err) => {
    logger.error({ err }, '💥 Failed to start workers');
    process.exit(1);
});
