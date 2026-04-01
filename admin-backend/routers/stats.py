from fastapi import APIRouter, Depends
from .database import db_instance
from .models import DashboardStats
from .auth import admin_required

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/", response_model=DashboardStats)
async def get_stats(_ = Depends(admin_required)):
    # Total Users
    total_users = await db_instance.db["users"].count_documents({})
    
    # Total Sellers
    total_sellers = await db_instance.db["users"].count_documents({"role": "SELLER"})
    
    # Total Products
    total_products = await db_instance.db["products"].count_documents({"isDeleted": False})
    
    # Total Orders
    total_orders = await db_instance.db["orders"].count_documents({})
    
    # Total Revenue (sum of grandTotal)
    pipeline = [
        {"$group": {"_id": None, "total_revenue": {"$sum": "$grandTotal"}}}
    ]
    cursor = db_instance.db["orders"].aggregate(pipeline)
    revenue_data = await cursor.to_list(length=1)
    total_revenue = revenue_data[0]["total_revenue"] if revenue_data else 0.0
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue
    }
