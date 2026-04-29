# Recommendation Event Contract

This document defines the Kafka event payloads consumed by `recommendation-ai-service`.

## Topics Consumed

- `product.created`
- `product.updated`
- `product.deleted`
- `cart.updated`
- `order.checkout.initiated`
- `user.registered`

## Payload Schemas

### `product.created` / `product.updated` / `product.deleted`

```json
{
  "eventType": "product.updated",
  "productId": "662f9d6a2f6f42a9e4dd1234"
}
```

### `cart.updated`

```json
{
  "eventType": "cart.updated",
  "buyerId": "662f9d6a2f6f42a9e4dd2345",
  "action": "add",
  "itemCount": 2,
  "items": [
    { "productId": "662f9d6a2f6f42a9e4dd1234", "quantity": 1 },
    { "productId": "662f9d6a2f6f42a9e4dd5678", "quantity": 2 }
  ]
}
```

### `order.checkout.initiated`

```json
{
  "eventType": "order.checkout.initiated",
  "orderId": "6630ac4d0cfe46b7cf123456",
  "buyerId": "662f9d6a2f6f42a9e4dd2345",
  "itemCount": 2,
  "items": [
    {
      "productId": "662f9d6a2f6f42a9e4dd1234",
      "category": "Electronics",
      "quantity": 1
    }
  ]
}
```

### `user.registered`

```json
{
  "eventType": "user.registered",
  "userId": "662f9d6a2f6f42a9e4dd2345"
}
```

## Validation Rules

- `eventType` must match the Kafka topic contract.
- IDs are required non-empty strings.
- `quantity` must be `>= 1`.
- Malformed events are ignored by the recommendation service.

## Compatibility Notes

- Keep existing fields backward-compatible when extending schemas.
- Additive fields are safe; breaking renames/removals require versioning.
