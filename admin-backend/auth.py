import jwt
from fastapi import Request, HTTPException, Depends
from config import settings
from enum import Enum

class UserRole(str, Enum):
    BUYER = "BUYER"
    SELLER = "SELLER"
    SUPER_ADMIN = "SUPER_ADMIN"

def verify_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Header missing")
    
    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token invalid: {str(e)}")

def admin_required(payload: dict = Depends(verify_token)):
    if payload.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin role required")
    return payload
