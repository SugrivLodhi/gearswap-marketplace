from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from database import db_instance
from models import ProductBase
from auth import admin_required
from bson import ObjectId
from kafka_events import publish_event

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/", response_model=List[ProductBase])
async def list_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _ = Depends(admin_required)
):
    # Any product across all sellers
    products = await db_instance.db["products"].find({}).skip(skip).limit(limit).to_list(length=None)
    for p in products:
        p["_id"] = str(p["_id"])
        p["sellerId"] = str(p["sellerId"])
    return products

@router.delete("/{product_id}")
async def moderate_product(product_id: str, _ = Depends(admin_required)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    # Soft delete
    result = await db_instance.db["products"].update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"isDeleted": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found or already deleted")
    await publish_event(
        "product.moderated",
        {
            "productId": product_id,
            "isDeleted": True,
            "moderatedBy": "admin",
        },
        key=product_id
    )
    await publish_event(
        "audit.event",
        {
            "action": "product.moderated",
            "resourceId": product_id,
            "resourceType": "product",
        },
        key=product_id
    )
    return {"message": "Product moderated (soft-deleted) successfully"}
