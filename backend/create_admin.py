import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "hr_ats")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_admin():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    admin_email = "admin@example.com"
    admin_password = "admin123"
    
    existing_user = await db.users.find_one({"email": admin_email})
    if existing_user:
        print(f"User {admin_email} already exists.")
        return

    admin_user = {
        "email": admin_email,
        "name": "System Admin",
        "password_hash": get_password_hash(admin_password),
        "role": "admin",
        "created_at": asyncio.get_event_loop().time() # timestamp
    }
    
    await db.users.insert_one(admin_user)
    print(f"Admin user created successfully.")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
