import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from './redis';
import { env } from './environment';

// Connection configuration for BullMQ
const connection = {
    host: new URL(env.redisUrl).hostname,
    port: parseInt(new URL(env.redisUrl).port || '6379', 10),
};

// ==================== QUEUES ====================

// Order Processing Queue
export const orderProcessingQueue = new Queue('order-processing', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
    },
});

// Email Notification Queue
export const emailQueue = new Queue('email-notifications', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'fixed',
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

// ==================== QUEUE EVENTS ====================

const orderProcessingEvents = new QueueEvents('order-processing', { connection });
const emailEvents = new QueueEvents('email-notifications', { connection });

orderProcessingEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Order processing job ${jobId} completed`);
});

orderProcessingEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Order processing job ${jobId} failed:`, failedReason);
});

emailEvents.on('completed', ({ jobId }) => {
    console.log(`✅ Email job ${jobId} completed`);
});

emailEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Email job ${jobId} failed:`, failedReason);
});

// ==================== JOB INTERFACES ====================

export interface OrderProcessingJobData {
    orderId: string;
    buyerId: string;
    total: number;
}

export interface EmailJobData {
    to: string;
    template: 'order-confirmation' | 'order-shipped' | 'seller-notification';
    variables: Record<string, any>;
}

// ==================== HELPER FUNCTIONS ====================

export async function enqueueOrderProcessing(data: OrderProcessingJobData): Promise<void> {
    await orderProcessingQueue.add('process-order', data);
    console.log(`📋 Enqueued order processing job for order ${data.orderId}`);
}

export async function enqueueEmail(data: EmailJobData): Promise<void> {
    await emailQueue.add('send-email', data);
    console.log(`📧 Enqueued email job to ${data.to}`);
}

export async function closeBullMQ(): Promise<void> {
    await orderProcessingQueue.close();
    await emailQueue.close();
    await orderProcessingEvents.close();
    await emailEvents.close();
    console.log('BullMQ queues closed');
}
