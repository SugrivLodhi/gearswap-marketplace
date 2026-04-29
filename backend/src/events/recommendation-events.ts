type ProductEventType = 'product.created' | 'product.updated' | 'product.deleted';

export interface ProductLifecycleEventPayload {
    eventType: ProductEventType;
    productId: string;
}

export interface UserRegisteredEventPayload {
    eventType: 'user.registered';
    userId: string;
}

export interface CartUpdatedEventItem {
    [key: string]: string | number;
    productId: string;
    quantity: number;
}

export interface CartUpdatedEventPayload {
    eventType: 'cart.updated';
    buyerId: string;
    action: 'add' | 'update' | 'remove' | 'clear';
    itemCount: number;
    items: CartUpdatedEventItem[];
}

export interface CheckoutEventItem {
    [key: string]: string | number;
    productId: string;
    category: string;
    quantity: number;
}

export interface OrderCheckoutInitiatedEventPayload {
    eventType: 'order.checkout.initiated';
    orderId: string;
    buyerId: string;
    itemCount: number;
    items: CheckoutEventItem[];
}

const requireNonEmptyString = (value: string, field: string): string => {
    if (!value || !value.trim()) {
        throw new Error(`Invalid event payload: ${field} must be non-empty`);
    }
    return value.trim();
};

const normalizeQuantity = (value: number): number => {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
};

export const buildProductLifecyclePayload = (
    eventType: ProductEventType,
    productId: string
): ProductLifecycleEventPayload => ({
    eventType,
    productId: requireNonEmptyString(productId, 'productId'),
});

export const buildUserRegisteredPayload = (
    userId: string
): UserRegisteredEventPayload => ({
    eventType: 'user.registered',
    userId: requireNonEmptyString(userId, 'userId'),
});

export const buildCartUpdatedPayload = (params: {
    buyerId: string;
    action: 'add' | 'update' | 'remove' | 'clear';
    items: CartUpdatedEventItem[];
}): CartUpdatedEventPayload => {
    const buyerId = requireNonEmptyString(params.buyerId, 'buyerId');
    const items = params.items
        .map((item) => ({
            productId: requireNonEmptyString(item.productId, 'items.productId'),
            quantity: normalizeQuantity(item.quantity),
        }))
        .filter((item) => Boolean(item.productId));

    return {
        eventType: 'cart.updated',
        buyerId,
        action: params.action,
        itemCount: items.length,
        items,
    };
};

export const buildOrderCheckoutInitiatedPayload = (params: {
    orderId: string;
    buyerId: string;
    items: CheckoutEventItem[];
}): OrderCheckoutInitiatedEventPayload => {
    const orderId = requireNonEmptyString(params.orderId, 'orderId');
    const buyerId = requireNonEmptyString(params.buyerId, 'buyerId');
    const items = params.items
        .map((item) => ({
            productId: requireNonEmptyString(item.productId, 'items.productId'),
            category: requireNonEmptyString(item.category, 'items.category'),
            quantity: normalizeQuantity(item.quantity),
        }))
        .filter((item) => Boolean(item.productId) && Boolean(item.category));

    return {
        eventType: 'order.checkout.initiated',
        orderId,
        buyerId,
        itemCount: items.length,
        items,
    };
};
