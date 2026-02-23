import pino from 'pino';
import { env } from '../config/environment';

/**
 * Structured logger powered by pino.
 * - Development: pretty-printed output via pino-pretty
 * - Production: newline-delimited JSON (ship to your log aggregator)
 */
export const logger = pino({
    level: env.nodeEnv === 'production' ? 'info' : 'debug',
    ...(env.nodeEnv !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
});

export default logger;
