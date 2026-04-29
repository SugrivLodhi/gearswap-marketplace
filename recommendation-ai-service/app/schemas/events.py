from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CartEventItem(BaseModel):
    productId: str = Field(..., min_length=1)
    quantity: int = Field(default=1, ge=1)


class CartUpdatedEvent(BaseModel):
    eventType: Literal["cart.updated"]
    buyerId: str = Field(..., min_length=1)
    action: Literal["add", "update", "remove", "clear"]
    itemCount: int = Field(default=0, ge=0)
    items: List[CartEventItem] = Field(default_factory=list)


class OrderEventItem(BaseModel):
    productId: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    quantity: int = Field(default=1, ge=1)


class OrderCheckoutInitiatedEvent(BaseModel):
    eventType: Literal["order.checkout.initiated"]
    orderId: str = Field(..., min_length=1)
    buyerId: str = Field(..., min_length=1)
    itemCount: int = Field(default=0, ge=0)
    items: List[OrderEventItem] = Field(default_factory=list)


class UserRegisteredEvent(BaseModel):
    eventType: Literal["user.registered"]
    userId: str = Field(..., min_length=1)


class ProductLifecycleEvent(BaseModel):
    eventType: Literal["product.created", "product.updated", "product.deleted"]
    productId: str = Field(..., min_length=1)


class UnknownEvent(BaseModel):
    eventType: Optional[str] = None
