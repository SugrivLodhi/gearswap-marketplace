import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { QUEUE_NAMES, RecommendationJobData } from '../queues';
import { logger } from '../utils/logger';
import { recommendationService } from '../modules/recommendation/recommendation.service';

export function createRecommendationWorker(concurrency: number = 1): Worker {
    logger.info(`👷 Starting Recommendation worker (concurrency: ${concurrency})`);

    const worker = new Worker(
        QUEUE_NAMES.RECOMMENDATION,
        async (job: Job<RecommendationJobData>) => {
            if (job.name === 'update-recommendations') {
                await processUpdateRecommendations(job.data);
            } else {
                logger.warn({ jobName: job.name }, 'Unknown job name in recommendation queue');
            }
        },
        {
            connection: getRedisConnection() as any,
            concurrency,
        }
    );

    worker.on('completed', (job) => {
        logger.debug({ jobId: job.id }, 'Recommendation job completed');
    });

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err }, 'Recommendation job failed');
    });

    return worker;
}

async function processUpdateRecommendations(data: RecommendationJobData): Promise<void> {
    const { userId, itemIds } = data;
    logger.info({ userId, itemCount: itemIds.length }, 'Processing update recommendations job');
    
    await recommendationService.updateRecommendationsGraph(itemIds);
}
