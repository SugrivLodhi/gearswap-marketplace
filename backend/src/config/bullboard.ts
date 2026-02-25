import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getEmailQueue } from '../queues';

/**
 * Creates and returns a configured Bull Board Express adapter.
 *
 * Mount the returned `serverAdapter.getRouter()` in your Express app:
 *   app.use('/admin/queues', serverAdapter.getRouter());
 *
 * To add more queues in the future, import them and push a new
 * BullMQAdapter(...) into the `queues` array.
 */
export function createBullBoardAdapter(): ExpressAdapter {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
        queues: [
            new BullMQAdapter(getEmailQueue()),
            // Add more queues here as your app grows:
            // new BullMQAdapter(getOrderQueue()),
            // new BullMQAdapter(getNotificationQueue()),
        ],
        serverAdapter,
        options: {
            uiConfig: {
                boardTitle: 'GearSwap Queue Dashboard',
                boardLogo: {
                    path: 'https://img.icons8.com/color/96/guitar.png',
                    width: '50px',
                    height: 'auto',
                },
                // Refresh the UI automatically every 5 seconds
                pollingInterval: {
                    forceInterval: 5000,
                },
            },
        },
    });

    return serverAdapter;
}
