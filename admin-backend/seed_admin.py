import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/gearswap")
DATABASE_NAME = "gearswap"

async def promote_to_admin(email: str):
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    user = await db["users"].find_one({"email": email})
    if not user:
        print(f"User with email {email} not found.")
        return
    
    result = await db["users"].update_one(
        {"email": email},
        {"$set": {"role": "SUPER_ADMIN"}}
    )
    
    if result.modified_count > 0:
        print(f"Successfully promoted {email} to SUPER_ADMIN.")
    else:
        print(f"User {email} is already a SUPER_ADMIN or update failed.")
    
    client.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python seed_admin.py <email>")
    else:
        email_to_promote = sys.argv[1]
        asyncio.run(promote_to_admin(email_to_promote))
