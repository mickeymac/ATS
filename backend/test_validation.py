import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.schemas.job import ApplicationInDB
from app.routers.applications import _enrich_application

async def test_validation():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    cursor = db.applications.find({})
    apps = await cursor.to_list(length=None)
    
    print(f"Testing validation on {len(apps)} applications...")
    errors = 0
    for app in apps:
        try:
            enriched = await _enrich_application(app, db)
            ApplicationInDB(**enriched)
        except Exception as e:
            print(f"Validation failed for app {app.get('_id')}: {e}")
            errors += 1
            
    print(f"Done. Found {errors} validation errors.")

if __name__ == "__main__":
    asyncio.run(test_validation())
