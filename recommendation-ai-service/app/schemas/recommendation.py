from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CartItem(BaseModel):
    product_id: str = Field(..., min_length=1)
    variant_id: Optional[str] = None
    quantity: int = Field(default=1, ge=1)


class RecommendCartRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    cart_items: List[CartItem] = Field(default_factory=list)
    limit: int = Field(default=8, ge=1, le=24)
    context: Dict[str, Any] = Field(default_factory=dict)


class RecommendProductRequest(BaseModel):
    product_id: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    limit: int = Field(default=8, ge=1, le=24)


class RecommendHomeRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    limit: int = Field(default=8, ge=1, le=24)
    session_context: Dict[str, Any] = Field(default_factory=dict)


class RecommendationItem(BaseModel):
    product_id: str
    score: float
    reason: str
    source: str = "hybrid-genai"


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]
    model_used: Optional[str] = None
    fallback_used: bool = False

