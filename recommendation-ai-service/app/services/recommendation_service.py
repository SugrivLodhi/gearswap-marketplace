from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from openai import OpenAI
from pymongo import MongoClient
from redis import Redis

from app.core.config import settings
from app.schemas.events import (
    CartUpdatedEvent,
    OrderCheckoutInitiatedEvent,
    ProductLifecycleEvent,
    UserRegisteredEvent,
)
from app.schemas.recommendation import (
    CartItem,
    RecommendationItem,
    RecommendationResponse,
)


class RecommendationService:
    def __init__(self) -> None:
        self._redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self._mongo = MongoClient(settings.MONGODB_URI)
        self._db = self._mongo[settings.MONGODB_DB_NAME]
        self._products = self._db["products"]
        self._orders = self._db["orders"]
        self._openai = (
            OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_SECONDS)
            if settings.OPENAI_API_KEY
            else None
        )

    def recommend_for_cart(
        self,
        user_id: str,
        cart_items: List[CartItem],
        limit: int,
        context: Optional[Dict] = None,
    ) -> RecommendationResponse:
        cache_key = self._build_cache_key(
            prefix="cart",
            payload={
                "user_id": user_id,
                "cart_items": [item.model_dump() for item in cart_items],
                "limit": limit,
                "context": context or {},
            },
        )
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        cart_ids = [item.product_id for item in cart_items]
        anchor_products = self._get_products_by_ids(cart_ids)
        anchor_text = self._build_anchor_text(anchor_products)
        candidates = self._get_candidate_products(exclude_ids=set(cart_ids))
        preferences = self._get_user_preferences(user_id)

        recommendations, used_fallback = self._rank_candidates(
            anchor_text=anchor_text,
            candidates=candidates,
            limit=limit,
            reason="Based on cart similarity",
            preferred_categories=preferences.get("categories", {}),
        )

        response = RecommendationResponse(
            recommendations=recommendations,
            model_used=settings.OPENAI_EMBEDDING_MODEL if not used_fallback else "heuristic",
            fallback_used=used_fallback,
        )
        self._set_cached(cache_key, response)
        return response

    def recommend_for_product(
        self,
        product_id: str,
        user_id: Optional[str],
        limit: int,
    ) -> RecommendationResponse:
        cache_key = self._build_cache_key(
            prefix="product",
            payload={"product_id": product_id, "user_id": user_id, "limit": limit},
        )
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        anchor_products = self._get_products_by_ids([product_id])
        anchor_text = self._build_anchor_text(anchor_products)
        candidates = self._get_candidate_products(exclude_ids={product_id})
        preferred_categories: Dict[str, float] = {}
        if user_id:
            preferred_categories = self._get_user_preferences(user_id).get("categories", {})

        recommendations, used_fallback = self._rank_candidates(
            anchor_text=anchor_text,
            candidates=candidates,
            limit=limit,
            reason="Similar to viewed product",
            preferred_categories=preferred_categories,
        )
        response = RecommendationResponse(
            recommendations=recommendations,
            model_used=settings.OPENAI_EMBEDDING_MODEL if not used_fallback else "heuristic",
            fallback_used=used_fallback,
        )
        self._set_cached(cache_key, response)
        return response

    def recommend_for_home(self, user_id: str, limit: int) -> RecommendationResponse:
        cache_key = self._build_cache_key(prefix="home", payload={"user_id": user_id, "limit": limit})
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        candidates = self._get_candidate_products(exclude_ids=set())
        # Home feed uses recency + stock + stable user-based perturbation.
        preferences = self._get_user_preferences(user_id)
        recommendations = self._rank_for_home(
            user_id=user_id,
            candidates=candidates,
            limit=limit,
            preferred_categories=preferences.get("categories", {}),
        )
        response = RecommendationResponse(
            recommendations=recommendations,
            model_used="hybrid-home-heuristic",
            fallback_used=True,
        )
        self._set_cached(cache_key, response)
        return response

    def _rank_candidates(
        self,
        anchor_text: str,
        candidates: List[Dict[str, Any]],
        limit: int,
        reason: str,
        preferred_categories: Optional[Dict[str, float]] = None,
    ) -> tuple[List[RecommendationItem], bool]:
        if not candidates:
            return [], True
        preferred_categories = preferred_categories or {}

        if not anchor_text:
            scored = sorted(candidates, key=self._business_score, reverse=True)
            diversified = self._apply_diversity(scored, limit)
            return self._to_recommendation_items(diversified, reason), True

        anchor_embedding = self._embed_text(anchor_text)
        if anchor_embedding is None:
            # Lexical fallback when OpenAI key/service is unavailable.
            anchor_tokens = self._tokenize(anchor_text)
            scored_candidates = sorted(
                candidates,
                key=lambda doc: (
                    self._lexical_similarity(anchor_tokens, self._tokenize(self._product_text(doc)))
                    + self._business_score(doc) * 0.25
                    + self._category_preference_boost(doc, preferred_categories)
                ),
                reverse=True,
            )
            diversified = self._apply_diversity(scored_candidates, limit)
            return self._to_recommendation_items(diversified, reason), True

        scored_with_similarity: List[tuple[Dict[str, Any], float]] = []
        for candidate in candidates:
            candidate_embedding = self._get_cached_embedding(candidate)
            if candidate_embedding is None:
                candidate_embedding = self._embed_text(self._product_text(candidate))
                if candidate_embedding is None:
                    continue
                self._set_cached_embedding(candidate, candidate_embedding)

            semantic = self._cosine_similarity(anchor_embedding, candidate_embedding)
            score = (
                semantic
                + (self._business_score(candidate) * 0.2)
                + self._category_preference_boost(candidate, preferred_categories)
            )
            scored_with_similarity.append((candidate, score))

        scored_with_similarity.sort(key=lambda item: item[1], reverse=True)
        sorted_docs = [doc for doc, _ in scored_with_similarity]
        top_docs = self._apply_diversity(sorted_docs, limit)
        return self._to_recommendation_items(top_docs, reason), False

    def _rank_for_home(
        self,
        user_id: str,
        candidates: List[Dict[str, Any]],
        limit: int,
        preferred_categories: Dict[str, float],
    ) -> List[RecommendationItem]:
        seed_value = int(hashlib.md5(user_id.encode("utf-8")).hexdigest()[:8], 16)
        scored = []
        for index, candidate in enumerate(candidates):
            jitter = ((seed_value + index) % 17) / 1000.0
            category = str(candidate.get("category", ""))
            category_boost = preferred_categories.get(category, 0.0) * 0.2
            scored.append((candidate, self._business_score(candidate) + category_boost + jitter))
        scored.sort(key=lambda item: item[1], reverse=True)
        top_docs = self._apply_diversity([doc for doc, _ in scored], limit)
        return self._to_recommendation_items(top_docs, "Trending and in-stock picks")

    def _category_preference_boost(
        self, product: Dict[str, Any], preferred_categories: Dict[str, float]
    ) -> float:
        category = str(product.get("category", "")).strip()
        if not category:
            return 0.0
        return float(preferred_categories.get(category, 0.0)) * 0.12

    def _apply_diversity(
        self, ranked_products: List[Dict[str, Any]], limit: int
    ) -> List[Dict[str, Any]]:
        selected: List[Dict[str, Any]] = []
        category_counts: Dict[str, int] = {}
        max_per_category = 2

        for product in ranked_products:
            if len(selected) >= limit:
                break
            category = str(product.get("category", "")).strip() or "unknown"
            used = category_counts.get(category, 0)
            if used >= max_per_category:
                continue
            selected.append(product)
            category_counts[category] = used + 1

        if len(selected) < limit:
            selected_ids = {str(p.get("_id")) for p in selected}
            for product in ranked_products:
                if len(selected) >= limit:
                    break
                if str(product.get("_id")) in selected_ids:
                    continue
                selected.append(product)
        return selected

    def _to_recommendation_items(
        self, products: List[Dict[str, Any]], reason: str
    ) -> List[RecommendationItem]:
        result: List[RecommendationItem] = []
        for rank, product in enumerate(products):
            product_id = str(product.get("_id"))
            if not product_id:
                continue
            result.append(
                RecommendationItem(
                    product_id=product_id,
                    score=round(max(0.0, 1.0 - (rank * 0.04)), 4),
                    reason=reason,
                )
            )
        return result

    def ingest_event(self, event_type: str, payload: Dict[str, Any]) -> None:
        if event_type in {"product.created", "product.updated", "product.deleted"}:
            parsed = self._safe_parse(ProductLifecycleEvent, payload)
            if parsed is not None:
                self._invalidate_product_embedding_cache(parsed.productId)
            return

        if event_type == "user.registered":
            parsed = self._safe_parse(UserRegisteredEvent, payload)
            if parsed is not None:
                self._initialize_user_preferences(parsed.userId)
            return

        if event_type == "order.checkout.initiated":
            parsed = self._safe_parse(OrderCheckoutInitiatedEvent, payload)
            if parsed is None:
                return

            event_items = [item.model_dump() for item in parsed.items]
            if self._ingest_order_preferences_from_event(parsed.buyerId, event_items):
                return

            self._ingest_order_preferences(parsed.buyerId, parsed.orderId)
            return

        if event_type == "cart.updated":
            parsed = self._safe_parse(CartUpdatedEvent, payload)
            if parsed is None:
                return
            event_items = [item.model_dump() for item in parsed.items]
            self._ingest_cart_preferences_from_event(parsed.buyerId, event_items)
            return

    def _safe_parse(self, schema: Any, payload: Dict[str, Any]) -> Optional[Any]:
        try:
            return schema.model_validate(payload)
        except Exception:
            return None

    def _build_cache_key(self, prefix: str, payload: Dict) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
        return f"reco:{prefix}:{digest}"

    def _user_pref_key(self, user_id: str) -> str:
        return f"reco:user-pref:{user_id}"

    def _initialize_user_preferences(self, user_id: str) -> None:
        try:
            self._redis.setnx(self._user_pref_key(user_id), json.dumps({"categories": {}}))
        except Exception:
            return

    def _get_user_preferences(self, user_id: str) -> Dict[str, Dict[str, float]]:
        try:
            raw = self._redis.get(self._user_pref_key(user_id))
        except Exception:
            return {"categories": {}}
        if raw is None:
            return {"categories": {}}
        try:
            parsed = json.loads(raw)
            categories = parsed.get("categories", {})
            if isinstance(categories, dict):
                normalized = {
                    str(k): float(v)
                    for k, v in categories.items()
                    if isinstance(k, str)
                }
                return {"categories": normalized}
        except Exception:
            return {"categories": {}}
        return {"categories": {}}

    def _set_user_preferences(self, user_id: str, categories: Dict[str, float]) -> None:
        payload = {"categories": categories}
        try:
            self._redis.set(self._user_pref_key(user_id), json.dumps(payload))
        except Exception:
            return

    def _ingest_order_preferences(self, user_id: str, order_id: str) -> None:
        order = self._orders.find_one({"_id": self._to_object_id(order_id)})
        if not order:
            return
        items = order.get("items", [])
        if not isinstance(items, list) or not items:
            return

        product_ids = [str(item.get("productId")) for item in items if item.get("productId")]
        ordered_products = self._get_products_by_ids(product_ids)
        if not ordered_products:
            return

        user_pref = self._get_user_preferences(user_id)
        categories = user_pref.get("categories", {})
        for product in ordered_products:
            category = str(product.get("category", "")).strip()
            if not category:
                continue
            categories[category] = float(categories.get(category, 0.0)) + 1.0

        # Light decay to avoid overfitting ancient behavior.
        for key in list(categories.keys()):
            categories[key] = round(categories[key] * 0.98, 4)
            if categories[key] < 0.05:
                categories.pop(key, None)

        self._set_user_preferences(user_id, categories)

    def _ingest_order_preferences_from_event(
        self, user_id: str, event_items: Any
    ) -> bool:
        if not isinstance(event_items, list) or not event_items:
            return False

        user_pref = self._get_user_preferences(user_id)
        categories = user_pref.get("categories", {})
        updated = False

        for item in event_items:
            if not isinstance(item, dict):
                continue
            category = str(item.get("category", "")).strip()
            quantity_raw = item.get("quantity", 1)
            try:
                quantity = max(1, int(quantity_raw))
            except Exception:
                quantity = 1

            if not category:
                continue

            categories[category] = float(categories.get(category, 0.0)) + float(quantity)
            updated = True

        if not updated:
            return False

        for key in list(categories.keys()):
            categories[key] = round(categories[key] * 0.98, 4)
            if categories[key] < 0.05:
                categories.pop(key, None)

        self._set_user_preferences(user_id, categories)
        return True

    def _ingest_cart_preferences_from_event(self, user_id: str, event_items: Any) -> None:
        if not isinstance(event_items, list) or not event_items:
            return

        product_ids: List[str] = []
        quantity_map: Dict[str, int] = {}
        for item in event_items:
            if not isinstance(item, dict):
                continue
            product_id = str(item.get("productId", "")).strip()
            if not product_id:
                continue
            quantity_raw = item.get("quantity", 1)
            try:
                quantity = max(1, int(quantity_raw))
            except Exception:
                quantity = 1
            product_ids.append(product_id)
            quantity_map[product_id] = quantity

        if not product_ids:
            return

        products = self._get_products_by_ids(product_ids)
        if not products:
            return

        user_pref = self._get_user_preferences(user_id)
        categories = user_pref.get("categories", {})

        for product in products:
            product_id = str(product.get("_id"))
            category = str(product.get("category", "")).strip()
            if not category:
                continue
            quantity = float(quantity_map.get(product_id, 1))
            # Cart interactions are weaker intent than completed orders.
            categories[category] = float(categories.get(category, 0.0)) + (0.3 * quantity)

        for key in list(categories.keys()):
            categories[key] = round(categories[key] * 0.995, 4)
            if categories[key] < 0.05:
                categories.pop(key, None)

        self._set_user_preferences(user_id, categories)

    def _invalidate_product_embedding_cache(self, product_id: str) -> None:
        pattern = f"reco:embed:{product_id}:*"
        try:
            keys = list(self._redis.scan_iter(match=pattern, count=100))
            if keys:
                self._redis.delete(*keys)
        except Exception:
            return

    def _get_cached(self, key: str) -> Optional[RecommendationResponse]:
        try:
            raw = self._redis.get(key)
        except Exception:
            return None
        if raw is None:
            return None
        parsed = json.loads(raw)
        return RecommendationResponse(**parsed)

    def _set_cached(self, key: str, response: RecommendationResponse) -> None:
        try:
            self._redis.setex(
                key,
                settings.RECOMMENDATION_CACHE_TTL_SECONDS,
                response.model_dump_json(),
            )
        except Exception:
            return

    def _get_products_by_ids(self, product_ids: List[str]) -> List[Dict[str, Any]]:
        if not product_ids:
            return []
        docs = list(
            self._products.find(
                {
                    "_id": {"$in": [self._to_object_id(pid) for pid in product_ids if self._to_object_id(pid)]},
                    "isDeleted": False,
                }
            )
        )
        by_id = {str(doc.get("_id")): doc for doc in docs}
        ordered: List[Dict[str, Any]] = []
        for product_id in product_ids:
            doc = by_id.get(product_id)
            if doc is not None:
                ordered.append(doc)
        return ordered

    def _get_candidate_products(self, exclude_ids: set[str]) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"isDeleted": False}
        if exclude_ids:
            object_ids = [self._to_object_id(pid) for pid in exclude_ids]
            valid_ids = [oid for oid in object_ids if oid is not None]
            if valid_ids:
                query["_id"] = {"$nin": valid_ids}
        return list(
            self._products.find(query)
            .sort("createdAt", -1)
            .limit(settings.RECOMMENDATION_CANDIDATE_POOL_SIZE)
        )

    def _build_anchor_text(self, products: List[Dict[str, Any]]) -> str:
        return " ".join(self._product_text(product) for product in products).strip()

    def _product_text(self, product: Dict[str, Any]) -> str:
        name = str(product.get("name", "")).strip()
        description = str(product.get("description", "")).strip()
        category = str(product.get("category", "")).strip()
        variants = product.get("variants", [])
        variant_bits: List[str] = []
        if isinstance(variants, list):
            for variant in variants[:4]:
                attributes = variant.get("attributes", {})
                if isinstance(attributes, dict):
                    variant_bits.extend([str(value) for value in attributes.values()])
        return f"{name} {description} {category} {' '.join(variant_bits)}".strip()

    def _business_score(self, product: Dict[str, Any]) -> float:
        variants = product.get("variants", [])
        total_stock = 0.0
        min_price = 0.0
        if isinstance(variants, list) and variants:
            stocks = [float(v.get("stock", 0) or 0) for v in variants]
            prices = [float(v.get("price", 0) or 0) for v in variants]
            total_stock = sum(stocks)
            positive_prices = [p for p in prices if p > 0]
            min_price = min(positive_prices) if positive_prices else 0.0

        created_at = product.get("createdAt")
        age_bonus = 0.0
        if isinstance(created_at, datetime):
            now = datetime.now(timezone.utc)
            created_utc = created_at.astimezone(timezone.utc)
            age_days = max(0.0, (now - created_utc).total_seconds() / 86400.0)
            age_bonus = max(0.0, 1.0 - (age_days / 30.0))

        stock_score = min(total_stock / 100.0, 1.0)
        price_score = 0.3 if min_price > 0 and min_price < 1000 else 0.15
        return stock_score + age_bonus + price_score

    def _embed_text(self, text: str) -> Optional[List[float]]:
        if not text.strip() or self._openai is None:
            return None
        try:
            response = self._openai.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text[:7000],
            )
            return list(response.data[0].embedding)
        except Exception:
            return None

    def _tokenize(self, text: str) -> set[str]:
        return set(token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2)

    def _lexical_similarity(self, a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        intersection = len(a.intersection(b))
        union = len(a.union(b))
        if union == 0:
            return 0.0
        return intersection / union

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _embedding_cache_key(self, product: Dict[str, Any]) -> Optional[str]:
        product_id = product.get("_id")
        updated_at = product.get("updatedAt")
        if product_id is None:
            return None
        timestamp = (
            updated_at.isoformat()
            if isinstance(updated_at, datetime)
            else str(updated_at or "")
        )
        return f"reco:embed:{product_id}:{hashlib.md5(timestamp.encode('utf-8')).hexdigest()}"

    def _get_cached_embedding(self, product: Dict[str, Any]) -> Optional[List[float]]:
        key = self._embedding_cache_key(product)
        if key is None:
            return None
        try:
            raw = self._redis.get(key)
        except Exception:
            return None
        if raw is None:
            return None
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [float(v) for v in parsed]
        except Exception:
            return None
        return None

    def _set_cached_embedding(self, product: Dict[str, Any], embedding: List[float]) -> None:
        key = self._embedding_cache_key(product)
        if key is None:
            return
        try:
            self._redis.setex(
                key,
                settings.RECOMMENDATION_CACHE_TTL_SECONDS * 10,
                json.dumps(embedding),
            )
        except Exception:
            return

    def _to_object_id(self, value: str) -> Any:
        try:
            from bson import ObjectId

            return ObjectId(value)
        except Exception:
            return None

