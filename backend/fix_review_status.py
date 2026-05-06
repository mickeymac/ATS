import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def fix_review_status():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    result = await db.applications.update_many(
        {"review_status": None},
        {"$set": {"review_status": "pending"}}
    )
    print(f"Fixed {result.modified_count} applications with null review_status.")

if __name__ == "__main__":
    asyncio.run(fix_review_status())
