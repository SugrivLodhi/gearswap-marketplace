import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import {
    EmailJobData,
    EmailJobName,
    WelcomeEmailJobData,
    OrderConfirmationEmailJobData,
    QUEUE_NAMES,
} from './types';

// ─── Shared Queue Options ──────────────────────────────────────────────────

const sharedQueueOptions: Partial<QueueOptions> = {
    defaultJobOptions: {
        /**
         * How many times to attempt a job before marking it Failed.
         * The first attempt counts, so attempts:5 = 1 try + 4 retries.
         */
        attempts: 5,
        backoff: {
            /**
             * Exponential backoff: delay = backoffDelay * 2^(attemptsMade - 1)
             * Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s, Attempt 4: 16s
             */
            type: 'exponential',
            delay: 2_000,
        },
        // Keep completed/failed jobs for observability (e.g. Bull Board)
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
    },
};

// ─── Email Queue ───────────────────────────────────────────────────────────

let emailQueueInstance: Queue<EmailJobData, void, EmailJobName> | null = null;

/**
 * Returns a singleton email Queue instance.
 * Calling this lazily means the server can boot without Redis
 * if you haven't enqueued anything yet.
 */
export function getEmailQueue(): Queue<EmailJobData, void, EmailJobName> {
    if (!emailQueueInstance) {
        emailQueueInstance = new Queue<EmailJobData, void, EmailJobName>(
            QUEUE_NAMES.EMAIL,
            {
                connection: getRedisConnection(),
                ...sharedQueueOptions,
            }
        );

        emailQueueInstance.on('error', (err: Error) => {
            logger.error({ err }, '❌ Email queue error');
        });

        logger.info('📬 Email queue initialised');
    }
    return emailQueueInstance;
}

// ─── Typed Enqueue Helpers ─────────────────────────────────────────────────

/**
 * Enqueue a welcome email job.
 *
 * Idempotent: if a job with the same `jobId` is already waiting or active,
 * BullMQ will silently skip adding a duplicate.
 */
export async function enqueueWelcomeEmail(
    data: WelcomeEmailJobData
): Promise<void> {
    const queue = getEmailQueue();
    await queue.add('welcome-email', data, {
        jobId: data.jobId, // deduplication key
    });
    logger.info({ jobId: data.jobId, email: data.email }, '📧 Welcome email job enqueued');
}

/**
 * Enqueue an order confirmation email job.
 *
 * Idempotent: if a job with the same `jobId` is already waiting or active,
 * BullMQ will silently skip adding a duplicate.
 */
export async function enqueueOrderConfirmationEmail(
    data: OrderConfirmationEmailJobData
): Promise<void> {
    const queue = getEmailQueue();
    await queue.add('order-confirmation-email', data, {
        jobId: data.jobId, // deduplication key
    });
    logger.info(
        { jobId: data.jobId, orderId: data.orderId },
        '📧 Order confirmation email job enqueued'
    );
}

/**
 * Gracefully close the email queue (drain pending events).
 * Call during process shutdown.
 */
export async function closeEmailQueue(): Promise<void> {
    if (emailQueueInstance) {
        await emailQueueInstance.close();
        emailQueueInstance = null;
        logger.info('✅ Email queue closed');
    }
}
