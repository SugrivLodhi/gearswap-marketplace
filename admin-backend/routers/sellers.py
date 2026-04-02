from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from database import db_instance
from models import UserBase, UserRole
from auth import admin_required
from bson import ObjectId

router = APIRouter(prefix="/sellers", tags=["Sellers"])

@router.get("/", response_model=List[UserBase])
async def list_sellers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _ = Depends(admin_required)
):
    # Sellers are just users with the SELLER role
    query = {"role": UserRole.SELLER}
    sellers = await db_instance.db["users"].find(query).skip(skip).limit(limit).to_list(length=None)
    for s in sellers:
        s["_id"] = str(s["_id"])
    return sellers

@router.get("/{seller_id}/stats")
async def get_seller_performance(seller_id: str, _ = Depends(admin_required)):
    if not ObjectId.is_valid(seller_id):
        raise HTTPException(status_code=400, detail="Invalid seller ID")
    
    # Total products by this seller
    total_products = await db_instance.db["products"].count_documents({"sellerId": ObjectId(seller_id), "isDeleted": False})
    
    # Total revenue by this seller
    pipeline = [
        {"$unwind": "$items"},
        {"$match": {"items.sellerId": ObjectId(seller_id)}},
        {"$group": {"_id": None, "total_revenue": {"$sum": "$items.totalAmount"}}}
    ]
    cursor = db_instance.db["orders"].aggregate(pipeline)
    revenue_data = await cursor.to_list(length=1)
    total_revenue = revenue_data[0]["total_revenue"] if revenue_data else 0.0
    
    return {
        "seller_id": seller_id,
        "total_products": total_products,
        "total_revenue": total_revenue
    }
