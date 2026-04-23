from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from database import db_instance
from models import UserBase, UserRole
from auth import admin_required
from bson import ObjectId
from kafka_events import publish_event

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserBase])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: UserRole = None,
    _ = Depends(admin_required)
):
    query = {}
    if role:
        query["role"] = role

    users = await db_instance.db["users"].find(query).skip(skip).limit(limit).to_list(length=None)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@router.get("/{user_id}", response_model=UserBase)
async def get_user(user_id: str, _ = Depends(admin_required)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db_instance.db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return user

@router.delete("/{user_id}")
async def delete_user(user_id: str, _ = Depends(admin_required)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    result = await db_instance.db["users"].update_one(
        {"_id": ObjectId(user_id), "isDeleted": {"$ne": True}},
        {"$set": {"isDeleted": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or already deleted")

    await publish_event(
        "user.deleted",
        {
            "userId": user_id,
            "deletedBy": "admin",
        },
        key=user_id
    )
    await publish_event(
        "audit.event",
        {
            "action": "user.deleted",
            "resourceId": user_id,
            "resourceType": "user",
        },
        key=user_id
    )
    return {"message": "User soft-deleted successfully"}
