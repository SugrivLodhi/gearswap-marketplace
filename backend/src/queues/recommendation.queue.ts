import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import {
    QUEUE_NAMES,
    UpdateRecommendationsJobData,
    RecommendationJobName,
} from './types';

let recommendationQueue: Queue | null = null;

export function getRecommendationQueue(): Queue {
    if (!recommendationQueue) {
        recommendationQueue = new Queue(QUEUE_NAMES.RECOMMENDATION, {
            connection: getRedisConnection() as any,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });
        logger.info(`✅ Initialized BullMQ queue: ${QUEUE_NAMES.RECOMMENDATION}`);
    }
    return recommendationQueue;
}

export async function enqueueUpdateRecommendations(
    data: Omit<UpdateRecommendationsJobData, 'jobId'>
): Promise<void> {
    const queue = getRecommendationQueue();
    // Unique job ID based on userId to throttle duplicate rapid requests
    const jobId = `rec:user:${data.userId}:${Date.now()}`;
    
    await queue.add(
        'update-recommendations' satisfies RecommendationJobName,
        { ...data, jobId },
        { jobId }
    );
    logger.debug({ userId: data.userId }, 'Enqueued update-recommendations job');
}

export async function closeRecommendationQueue(): Promise<void> {
    if (recommendationQueue) {
        await recommendationQueue.close();
        recommendationQueue = null;
        logger.info(`✅ Closed queue: ${QUEUE_NAMES.RECOMMENDATION}`);
    }
}
