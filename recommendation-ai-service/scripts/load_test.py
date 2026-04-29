import argparse
import asyncio
import random
import time
from statistics import mean
from typing import List

import httpx
from pymongo import MongoClient


def sample_product_ids(mongo_uri: str, db_name: str, limit: int) -> List[str]:
    mongo = MongoClient(mongo_uri)
    products = (
        mongo[db_name]["products"]
        .find({"isDeleted": False}, {"_id": 1})
        .limit(limit)
    )
    return [str(p["_id"]) for p in products]


async def run_once(client: httpx.AsyncClient, api_base: str, product_ids: List[str], k: int) -> float:
    selected = random.sample(product_ids, k=min(3, len(product_ids)))
    payload = {
        "user_id": f"load-user-{random.randint(1, 5000)}",
        "cart_items": [{"product_id": pid, "quantity": 1} for pid in selected],
        "limit": k,
    }
    start = time.perf_counter()
    resp = await client.post(f"{api_base}/v1/recommend/cart", json=payload)
    elapsed_ms = (time.perf_counter() - start) * 1000
    if resp.status_code != 200:
        return -1.0
    return elapsed_ms


async def load_test(api_base: str, mongo_uri: str, db_name: str, requests: int, concurrency: int, k: int) -> None:
    product_ids = sample_product_ids(mongo_uri, db_name, 200)
    if len(product_ids) < 3:
        print("Not enough products found for load test.")
        return

    semaphore = asyncio.Semaphore(concurrency)
    latencies: List[float] = []
    failures = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        async def task() -> None:
            nonlocal failures
            async with semaphore:
                ms = await run_once(client, api_base, product_ids, k)
                if ms < 0:
                    failures += 1
                else:
                    latencies.append(ms)

        await asyncio.gather(*(task() for _ in range(requests)))

    if not latencies:
        print("All requests failed.")
        return

    sorted_lat = sorted(latencies)
    p95_idx = int(len(sorted_lat) * 0.95) - 1
    p99_idx = int(len(sorted_lat) * 0.99) - 1
    p95 = sorted_lat[max(0, p95_idx)]
    p99 = sorted_lat[max(0, p99_idx)]

    print(f"Requests: {requests}, Concurrency: {concurrency}, Failures: {failures}")
    print(f"Mean latency: {mean(latencies):.2f}ms")
    print(f"P95 latency: {p95:.2f}ms")
    print(f"P99 latency: {p99:.2f}ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load test recommendation endpoint.")
    parser.add_argument("--api-base", default="http://localhost:9010")
    parser.add_argument("--mongo-uri", default="mongodb://localhost:27017/gearswap")
    parser.add_argument("--db-name", default="gearswap")
    parser.add_argument("--requests", type=int, default=200)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("-k", type=int, default=8)
    args = parser.parse_args()

    asyncio.run(
        load_test(
            api_base=args.api_base,
            mongo_uri=args.mongo_uri,
            db_name=args.db_name,
            requests=args.requests,
            concurrency=args.concurrency,
            k=args.k,
        )
    )
