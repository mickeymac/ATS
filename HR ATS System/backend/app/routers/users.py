from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.deps import check_role, get_db
from app.schemas.user import UserInDB, UserCreate, UserRole
from app.core.security import get_password_hash
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[UserInDB])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.users.find().skip(skip).limit(limit)
    users = []
    async for user in cursor:
        user["_id"] = str(user["_id"])
        users.append(UserInDB(**user))
    return users

@router.post("/", response_model=UserInDB)
async def create_user(
    user_in: UserCreate,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )
    
    user_doc = user_in.dict()
    user_doc["password_hash"] = get_password_hash(user_in.password)
    del user_doc["password"]
    user_doc["created_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)
    return UserInDB(**user_doc)
