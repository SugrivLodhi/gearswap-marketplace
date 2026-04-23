from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from auth import admin_required
from config import settings

router = APIRouter(prefix="/ops", tags=["Ops"])


@router.get(
    "/inventory-reservations",
    responses={502: {"description": "Catalog service unavailable"}},
)
async def list_inventory_reservations(
    _: Annotated[dict, Depends(admin_required)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    url = f"{settings.CATALOG_SERVICE_BASE_URL}/ops/inventory-reservations"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params={"limit": limit})
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=error.response.status_code,
            detail=f"Catalog service error: {error.response.text}",
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Catalog service unavailable: {error}")


@router.get(
    "/inventory-reservations/{request_id}",
    responses={502: {"description": "Catalog service unavailable"}},
)
async def get_inventory_reservation(
    request_id: str,
    _: Annotated[dict, Depends(admin_required)],
):
    url = f"{settings.CATALOG_SERVICE_BASE_URL}/ops/inventory-reservations/{request_id}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=error.response.status_code,
            detail=f"Catalog service error: {error.response.text}",
        )
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Catalog service unavailable: {error}")
