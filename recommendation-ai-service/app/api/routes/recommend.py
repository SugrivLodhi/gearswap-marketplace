from fastapi import APIRouter

from app.core.config import settings
from app.schemas.recommendation import (
    RecommendCartRequest,
    RecommendHomeRequest,
    RecommendProductRequest,
    RecommendationResponse,
)
from app.services.runtime import recommendation_service


router = APIRouter()


@router.post("/cart", response_model=RecommendationResponse)
async def recommend_cart(payload: RecommendCartRequest) -> RecommendationResponse:
    limit = min(payload.limit, settings.MAX_RECOMMENDATION_LIMIT)
    return recommendation_service.recommend_for_cart(
        user_id=payload.user_id,
        cart_items=payload.cart_items,
        limit=limit,
        context=payload.context,
    )


@router.post("/product", response_model=RecommendationResponse)
async def recommend_product(payload: RecommendProductRequest) -> RecommendationResponse:
    limit = min(payload.limit, settings.MAX_RECOMMENDATION_LIMIT)
    return recommendation_service.recommend_for_product(
        product_id=payload.product_id,
        user_id=payload.user_id,
        limit=limit,
    )


@router.post("/home", response_model=RecommendationResponse)
async def recommend_home(payload: RecommendHomeRequest) -> RecommendationResponse:
    limit = min(payload.limit, settings.MAX_RECOMMENDATION_LIMIT)
    return recommendation_service.recommend_for_home(user_id=payload.user_id, limit=limit)

