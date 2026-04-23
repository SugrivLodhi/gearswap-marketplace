import { env } from '../config/environment';
import logger from '../utils/logger';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type EventPayload = Record<string, JsonValue>;

let producer: any | null = null;
let kafkaEnabled = false;

const nowIso = (): string => new Date().toISOString();

const createProducer = async (): Promise<any | null> => {
    if (!env.kafkaEnabled) {
        return null;
    }

    if (producer) {
        return producer;
    }

    try {
        // Loaded lazily so backend still runs without kafkajs installed.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
            clientId: env.kafkaClientId,
            brokers: env.kafkaBrokers,
        });

        producer = kafka.producer();
        await producer.connect();
        kafkaEnabled = true;
        logger.info({ brokers: env.kafkaBrokers }, 'Kafka producer connected');
        return producer;
    } catch (error) {
        kafkaEnabled = false;
        logger.warn(
            { err: error, brokers: env.kafkaBrokers },
            'Kafka disabled: producer init failed; API behavior remains unchanged'
        );
        return null;
    }
};

export const publishEvent = async (
    topic: string,
    payload: EventPayload,
    key?: string
): Promise<void> => {
    const kafkaProducer = await createProducer();
    if (!kafkaProducer) {
        return;
    }

    const message = {
        key,
        value: JSON.stringify({
            ...payload,
            eventType: topic,
            emittedAt: nowIso(),
        }),
    };

    try {
        await kafkaProducer.send({
            topic,
            messages: [message],
        });
    } catch (error) {
        logger.error(
            { err: error, topic, key },
            'Kafka publish failed (non-blocking)'
        );
    }
};

export const disconnectEventProducer = async (): Promise<void> => {
    if (!producer || !kafkaEnabled) {
        return;
    }

    try {
        await producer.disconnect();
        logger.info('Kafka producer disconnected');
    } catch (error) {
        logger.warn({ err: error }, 'Failed to disconnect Kafka producer cleanly');
    } finally {
        producer = null;
        kafkaEnabled = false;
    }
};
