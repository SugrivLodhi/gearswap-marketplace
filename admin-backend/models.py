from pydantic import BaseModel, EmailStr, Field, ConfigDict, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from typing import List, Optional, Dict, Annotated, Any
from enum import Enum
from datetime import datetime
from bson import ObjectId

class _ObjectIdPydanticAnnotation:
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Any,
    ) -> core_schema.CoreSchema:
        def validate_from_str(v: Any) -> ObjectId:
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId")
            return ObjectId(v)

        from_str_schema = core_schema.chain_schema(
            [
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(validate_from_str),
            ]
        )

        return core_schema.json_or_python_schema(
            json_schema=from_str_schema,
            python_schema=core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    from_str_schema,
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(str),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return handler(core_schema.str_schema())

PyObjectId = Annotated[ObjectId, _ObjectIdPydanticAnnotation]

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

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class ProductBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    category: str
    imageUrl: str
    sellerId: PyObjectId
    isDeleted: bool = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class OrderBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    buyerId: PyObjectId
    status: str
    grandTotal: float
    createdAt: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class DashboardStats(BaseModel):
    total_users: int
    total_sellers: int
    total_products: int
    total_orders: int
    total_revenue: float
