from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import db_instance
from routers import users, stats, sellers, products

app = FastAPI(title="GearSwap Admin API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await db_instance.connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db_instance.close_mongo_connection()

# Include Routers
app.include_router(users.router)
app.include_router(stats.router)
app.include_router(sellers.router)
app.include_router(products.router)

@app.get("/")
async def root():
    return {"message": "GearSwap Admin API is running"}
