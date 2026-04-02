import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import bcrypt
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/gearswap")
DATABASE_NAME = "gearswap"

async def seed_super_admin():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    
    email = "cilans.sugriv@gmail.com"
    password = "Cilans@123"
    role = "SUPER_ADMIN"
    
    # Hash password using bcrypt (rounds=10 to match Node.js backend)
    # bcrypt.hashpw expects bytes
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(10))
    
    user_data = {
        "email": email,
        "password": hashed_password.decode('utf-8'),
        "role": role,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    # Update or insert
    result = await db["users"].update_one(
        {"email": email},
        {"$set": user_data},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"Successfully created SUPER_ADMIN user: {email}")
    elif result.modified_count > 0:
        print(f"Successfully updated SUPER_ADMIN user: {email}")
    else:
        print(f"User {email} already exists with these credentials.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_super_admin())
