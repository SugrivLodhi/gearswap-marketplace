from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer

from app.core.config import settings
from app.services.recommendation_service import RecommendationService


logger = logging.getLogger(__name__)


class RecommendationEventConsumer:
    def __init__(self, recommendation_service: RecommendationService) -> None:
        self._service = recommendation_service
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        if not settings.KAFKA_ENABLED or self._running:
            return

        self._consumer = AIOKafkaConsumer(
            *settings.KAFKA_TOPICS,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_GROUP_ID,
            client_id=settings.KAFKA_CLIENT_ID,
            auto_offset_reset="latest",
            enable_auto_commit=True,
        )
        await self._consumer.start()
        self._running = True
        self._task = asyncio.create_task(self._consume_loop())
        logger.info("Recommendation Kafka consumer started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        if self._consumer:
            await self._consumer.stop()
            self._consumer = None
        logger.info("Recommendation Kafka consumer stopped")

    async def _consume_loop(self) -> None:
        if self._consumer is None:
            return

        while self._running:
            try:
                async for message in self._consumer:
                    payload = self._decode(message.value)
                    if payload is None:
                        continue
                    event_type = payload.get("eventType") or message.topic
                    self._service.ingest_event(str(event_type), payload)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Recommendation event consume error: %s", exc)
                await asyncio.sleep(1.0)

    def _decode(self, raw: bytes) -> Optional[dict]:
        try:
            text = raw.decode("utf-8")
            payload = json.loads(text)
            if isinstance(payload, dict):
                return payload
            return None
        except Exception:
            return None

