from app.services.event_consumer import RecommendationEventConsumer
from app.services.recommendation_service import RecommendationService

recommendation_service = RecommendationService()
event_consumer = RecommendationEventConsumer(recommendation_service)

