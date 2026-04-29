import argparse
import os
from collections import defaultdict
from statistics import mean
from typing import Dict, List, Set, Tuple

import httpx
from pymongo import MongoClient


def precision_at_k(pred: List[str], actual: Set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    top = pred[:k]
    if not top:
        return 0.0
    hits = sum(1 for pid in top if pid in actual)
    return hits / len(top)


def recall_at_k(pred: List[str], actual: Set[str], k: int) -> float:
    if not actual:
        return 0.0
    top = pred[:k]
    hits = sum(1 for pid in top if pid in actual)
    return hits / len(actual)


def evaluate(api_base: str, mongo_uri: str, db_name: str, sample_users: int, k: int) -> None:
    mongo = MongoClient(mongo_uri)
    db = mongo[db_name]
    orders = db["orders"]

    user_to_products: Dict[str, List[str]] = defaultdict(list)
    for order in orders.find({}, {"buyerId": 1, "items.productId": 1}).sort("createdAt", -1).limit(5000):
        buyer_id = str(order.get("buyerId", ""))
        items = order.get("items", [])
        if not buyer_id or not isinstance(items, list):
            continue
        for item in items:
            product_id = str(item.get("productId", ""))
            if product_id:
                user_to_products[buyer_id].append(product_id)

    users = [uid for uid, p in user_to_products.items() if len(set(p)) >= 4][:sample_users]
    if not users:
        print("No eligible users for offline evaluation.")
        return

    precision_scores: List[float] = []
    recall_scores: List[float] = []
    coverage_ids: Set[str] = set()
    per_user_diversity: List[float] = []

    with httpx.Client(timeout=10.0) as client:
        for user_id in users:
            products = user_to_products[user_id]
            actual_next = set(products[-2:])  # lightweight holdout
            cart_seed = list(dict.fromkeys(products[:-2]))[-3:]
            if not cart_seed or not actual_next:
                continue

            payload = {
                "user_id": user_id,
                "cart_items": [{"product_id": pid, "quantity": 1} for pid in cart_seed],
                "limit": k,
            }
            resp = client.post(f"{api_base}/v1/recommend/cart", json=payload)
            if resp.status_code != 200:
                continue
            data = resp.json()
            recs = [str(item.get("product_id")) for item in data.get("recommendations", []) if item.get("product_id")]
            if not recs:
                continue

            precision_scores.append(precision_at_k(recs, actual_next, k))
            recall_scores.append(recall_at_k(recs, actual_next, k))
            coverage_ids.update(recs)
            per_user_diversity.append(len(set(recs)) / max(1, len(recs)))

    total_users = max(1, len(precision_scores))
    print(f"Users evaluated: {total_users}")
    print(f"Precision@{k}: {mean(precision_scores) if precision_scores else 0.0:.4f}")
    print(f"Recall@{k}: {mean(recall_scores) if recall_scores else 0.0:.4f}")
    print(f"Coverage (unique recommended products): {len(coverage_ids)}")
    print(f"Diversity (unique ratio in top-{k}): {mean(per_user_diversity) if per_user_diversity else 0.0:.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Offline evaluation for recommendation service.")
    parser.add_argument("--api-base", default=os.getenv("RECO_API_BASE", "http://localhost:9010"))
    parser.add_argument("--mongo-uri", default=os.getenv("MONGODB_URI", "mongodb://localhost:27017/gearswap"))
    parser.add_argument("--db-name", default=os.getenv("MONGODB_DB_NAME", "gearswap"))
    parser.add_argument("--sample-users", type=int, default=50)
    parser.add_argument("-k", type=int, default=10)
    args = parser.parse_args()

    evaluate(args.api_base, args.mongo_uri, args.db_name, args.sample_users, args.k)
