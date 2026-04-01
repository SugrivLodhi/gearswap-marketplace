from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserRole(str, Enum):
    BUYER = "BUYER"
    SELLER = "SELLER"
    SUPER_ADMIN = "SUPER_ADMIN"

class UserBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    role: UserRole
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ProductBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    category: str
    imageUrl: str
    sellerId: PyObjectId
    isDeleted: bool = False

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class OrderBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    buyerId: PyObjectId
    status: str
    grandTotal: float
    createdAt: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DashboardStats(BaseModel):
    total_users: int
    total_sellers: int
    total_products: int
    total_orders: int
    total_revenue: float
