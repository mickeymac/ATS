import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ATS_Tecnoprism")

async def init():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    await db.users.create_index("email", unique=True)
    client.close()

if __name__ == "__main__":
    asyncio.run(init())
