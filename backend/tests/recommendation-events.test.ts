import {
    buildCartUpdatedPayload,
    buildOrderCheckoutInitiatedPayload,
    buildProductLifecyclePayload,
    buildUserRegisteredPayload,
} from '../src/events/recommendation-events';

describe('recommendation event builders', () => {
    it('builds product lifecycle payload', () => {
        const payload = buildProductLifecyclePayload(
            'product.updated',
            '662f9d6a2f6f42a9e4dd1234'
        );
        expect(payload).toEqual({
            eventType: 'product.updated',
            productId: '662f9d6a2f6f42a9e4dd1234',
        });
    });

    it('builds cart.updated payload with normalized quantity', () => {
        const payload = buildCartUpdatedPayload({
            buyerId: 'buyer-1',
            action: 'add',
            items: [
                { productId: 'p1', quantity: 0 },
                { productId: 'p2', quantity: 4.8 },
            ],
        });

        expect(payload.eventType).toBe('cart.updated');
        expect(payload.itemCount).toBe(2);
        expect(payload.items).toEqual([
            { productId: 'p1', quantity: 1 },
            { productId: 'p2', quantity: 4 },
        ]);
    });

    it('builds checkout payload with validated fields', () => {
        const payload = buildOrderCheckoutInitiatedPayload({
            orderId: 'order-1',
            buyerId: 'buyer-1',
            items: [{ productId: 'p1', category: 'Electronics', quantity: 2 }],
        });

        expect(payload.eventType).toBe('order.checkout.initiated');
        expect(payload.itemCount).toBe(1);
        expect(payload.items[0]).toEqual({
            productId: 'p1',
            category: 'Electronics',
            quantity: 2,
        });
    });

    it('builds user.registered payload', () => {
        const payload = buildUserRegisteredPayload('user-1');
        expect(payload).toEqual({
            eventType: 'user.registered',
            userId: 'user-1',
        });
    });

    it('throws for invalid required fields', () => {
        expect(() =>
            buildOrderCheckoutInitiatedPayload({
                orderId: '',
                buyerId: 'buyer-1',
                items: [],
            })
        ).toThrow('Invalid event payload: orderId must be non-empty');
    });
});
