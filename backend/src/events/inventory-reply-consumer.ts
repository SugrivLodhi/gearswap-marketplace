import { Kafka, Consumer } from 'kafkajs';
import { env } from '../config/environment';
import logger from '../utils/logger';

interface InventoryReserveReply {
    requestId: string;
    orderId?: string;
    success: boolean;
    reason?: string;
}

const pendingReplies = new Map<
    string,
    {
        resolve: (value: InventoryReserveReply) => void;
        reject: (reason?: Error) => void;
        timeout: NodeJS.Timeout;
    }
>();

let consumer: Consumer | null = null;

export const startInventoryReplyConsumer = async (): Promise<void> => {
    if (!env.kafkaEnabled || env.inventoryReservationMode !== 'saga') {
        return;
    }

    if (consumer) {
        return;
    }

    try {
        const kafka = new Kafka({
            clientId: `${env.kafkaClientId}-inventory-reply`,
            brokers: env.kafkaBrokers,
        });

        consumer = kafka.consumer({
            groupId: `${env.kafkaClientId}-inventory-reply-group`,
        });

        await consumer.connect();
        await consumer.subscribe({ topic: 'inventory.reserve.reply', fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) {
                    return;
                }
                try {
                    const reply = JSON.parse(message.value.toString()) as InventoryReserveReply;
                    if (!reply.requestId) {
                        return;
                    }
                    const pending = pendingReplies.get(reply.requestId);
                    if (!pending) {
                        return;
                    }
                    clearTimeout(pending.timeout);
                    pendingReplies.delete(reply.requestId);
                    pending.resolve(reply);
                } catch (error) {
                    logger.error({ err: error }, 'Failed to parse inventory reserve reply');
                }
            },
        });

        logger.info('Inventory reserve reply consumer started');
    } catch (error) {
        logger.error({ err: error }, 'Failed to start inventory reserve reply consumer');
    }
};

export const waitForInventoryReserveReply = (
    requestId: string,
    timeoutMs: number
): Promise<InventoryReserveReply> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingReplies.delete(requestId);
            reject(new Error(`Inventory reserve reply timed out for requestId=${requestId}`));
        }, timeoutMs);

        pendingReplies.set(requestId, {
            resolve,
            reject,
            timeout,
        });
    });
};

export const disconnectInventoryReplyConsumer = async (): Promise<void> => {
    for (const [requestId, pending] of pendingReplies.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`Reservation aborted while shutting down (requestId=${requestId})`));
        pendingReplies.delete(requestId);
    }

    if (!consumer) {
        return;
    }

    try {
        await consumer.disconnect();
        logger.info('Inventory reserve reply consumer disconnected');
    } catch (error) {
        logger.warn({ err: error }, 'Failed to disconnect inventory reserve reply consumer');
    } finally {
        consumer = null;
    }
};
