/**
 * Queue registry — centralised exports for all queue instances and helpers.
 * Import from this module throughout the application; never import
 * from individual queue files directly in service/resolver code.
 */

export {
    getEmailQueue,
    enqueueWelcomeEmail,
    enqueueOrderConfirmationEmail,
    closeEmailQueue,
} from './email.queue';

export * from './types';
