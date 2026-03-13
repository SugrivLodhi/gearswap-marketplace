import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';
import {
    EmailJobData,
    EmailJobName,
    WelcomeEmailJobData,
    OrderConfirmationEmailJobData,
    QUEUE_NAMES,
} from '../queues/types';

// ─── Job Handlers ───────────────────────────────────────────────────────────

/**
 * Handle "welcome-email" jobs.
 *
 * Replace the log statements below with your real email provider:
 *   - Nodemailer (SMTP)
 *   - AWS SES (aws-sdk)
 *   - SendGrid (@sendgrid/mail)
 *
 * This function is intentionally isolated — adding real sending requires
 * zero changes outside this file.
 */
async function handleWelcomeEmail(job: Job<WelcomeEmailJobData>): Promise<void> {
    const { email, userId, name } = job.data;

    logger.info(
        { jobId: job.id, userId, email, attempt: job.attemptsMade + 1 },
        '✉️  [welcome-email] Sending welcome email'
    );

    // ── Replace below with your actual email sending logic ──────────────────
    // Example with Nodemailer:
    //
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({
    //     to: email,
    //     from: 'noreply@gearswap.com',
    //     subject: 'Welcome to GearSwap!',
    //     html: welcomeTemplate({ name }),
    // });
    //
    // Simulating async work:
    await new Promise((resolve) => setTimeout(resolve, 50));
    // ────────────────────────────────────────────────────────────────────────

    logger.info(
        { jobId: job.id, userId, email },
        `✅ [welcome-email] Email sent successfully to${name ? ` ${name} <${email}>` : ` <${email}>`}`
    );
}

/**
 * Handle "order-confirmation-email" jobs.
 */
async function handleOrderConfirmationEmail(
    job: Job<OrderConfirmationEmailJobData>
): Promise<void> {
    const { orderId, buyerEmail, buyerName, total, currency = 'INR' } = job.data;

    logger.info(
        { jobId: job.id, orderId, buyerEmail, attempt: job.attemptsMade + 1 },
        '✉️  [order-confirmation-email] Sending order confirmation'
    );

    // ── Replace below with your actual email sending logic ──────────────────
    // Example with Nodemailer:
    //
    // await transporter.sendMail({
    //     to: buyerEmail,
    //     subject: `GearSwap — Order #${orderId} confirmed`,
    //     html: orderConfirmationTemplate({ orderId, total, currency }),
    // });
    //
    await new Promise((resolve) => setTimeout(resolve, 50));
    // ────────────────────────────────────────────────────────────────────────

    logger.info(
        { jobId: job.id, orderId, buyerEmail, total, currency },
        `✅ [order-confirmation-email] Confirmation sent to${buyerName ? ` ${buyerName}` : ''} <${buyerEmail}>`
    );
}

// ─── Worker Factory ─────────────────────────────────────────────────────────

/**
 * Creates and returns a BullMQ Worker for the email queue.
 *
 * @param concurrency How many jobs to process in parallel (default: 5)
 */
export function createEmailWorker(concurrency = 5): Worker<EmailJobData, void, EmailJobName> {
    const worker = new Worker<EmailJobData, void, EmailJobName>(
        QUEUE_NAMES.EMAIL,
        async (job: Job<EmailJobData, void, EmailJobName>) => {
            switch (job.name) {
                case 'welcome-email':
                    await handleWelcomeEmail(job as Job<WelcomeEmailJobData>);
                    break;

                case 'order-confirmation-email':
                    await handleOrderConfirmationEmail(
                        job as Job<OrderConfirmationEmailJobData>
                    );
                    break;

                default: {
                    // Exhaustive check — TypeScript will warn if a job name is unhandled
                    const _exhaustive: never = job.name;
                    logger.warn({ jobName: job.name }, '⚠️  Unknown email job name — skipping');
                    break;
                }
            }
        },
        {
            connection: getRedisConnection() as any,
            concurrency,
        }
    );

    // ─── Worker Event Listeners ──────────────────────────────────────────────

    worker.on('completed', (job: Job<EmailJobData>) => {
        logger.info({ jobId: job.id, jobName: job.name }, '✅ Email job completed');
    });

    worker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
        logger.error(
            { jobId: job?.id, jobName: job?.name, attempt: job?.attemptsMade, err },
            '❌ Email job failed'
        );
    });

    worker.on('stalled', (jobId: string) => {
        logger.warn({ jobId }, '⚠️  Email job stalled — will be retried');
    });

    worker.on('error', (err: Error) => {
        logger.error({ err }, '❌ Email worker error');
    });

    logger.info({ concurrency }, '👷 Email worker started');

    return worker;
}
