/**
 * Shared TypeScript interfaces for all BullMQ job payloads.
 * Import from this file in both queue producers and worker consumers
 * to ensure type safety across the producer/consumer boundary.
 */

// ─── Email Job Data ──────────────────────────────────────────────────────────

export interface WelcomeEmailJobData {
    /** Idempotency key — BullMQ deduplicates jobs with the same jobId */
    jobId: string;
    userId: string;
    email: string;
    name?: string;
}

export interface OrderConfirmationEmailJobData {
    /** Idempotency key — BullMQ deduplicates jobs with the same jobId */
    jobId: string;
    orderId: string;
    buyerEmail: string;
    buyerName?: string;
    total: number;
    currency?: string;
}

/** Union of all email job payloads */
export type EmailJobData = WelcomeEmailJobData | OrderConfirmationEmailJobData;

/** Discriminant: the job name used when calling queue.add() */
export type EmailJobName = 'welcome-email' | 'order-confirmation-email';

// ─── Queue Names (centralised to prevent typos) ──────────────────────────────

export const QUEUE_NAMES = {
    EMAIL: 'email',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
