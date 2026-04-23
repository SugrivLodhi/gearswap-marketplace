import json
import logging
from datetime import datetime, timezone
from typing import Optional

from config import settings

logger = logging.getLogger("admin.kafka")
producer = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_producer():
    global producer
    if not settings.KAFKA_ENABLED:
        return None

    if producer is not None:
        return producer

    try:
        from aiokafka import AIOKafkaProducer  # imported lazily

        producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
            client_id=settings.KAFKA_CLIENT_ID,
        )
        await producer.start()
        logger.info("Kafka producer connected for admin backend")
        return producer
    except Exception:
        logger.exception("Kafka disabled for admin backend: producer init failed")
        producer = None
        return None


async def publish_event(topic: str, payload: dict, key: Optional[str] = None) -> None:
    kafka_producer = await _get_producer()
    if kafka_producer is None:
        return

    body = {
        **payload,
        "eventType": topic,
        "emittedAt": _now_iso(),
    }

    try:
        await kafka_producer.send_and_wait(
            topic=topic,
            key=key.encode("utf-8") if key else None,
            value=json.dumps(body).encode("utf-8"),
        )
    except Exception:
        logger.exception("Kafka publish failed for topic %s", topic)


async def close_producer() -> None:
    global producer
    if producer is None:
        return
    try:
        await producer.stop()
    except Exception:
        logger.exception("Failed to close admin Kafka producer")
    finally:
        producer = None
