from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.deps import check_role, get_db, get_current_active_user
from app.schemas.user import UserInDB, UserCreate, UserRole, UserUpdate
from app.core.security import get_password_hash
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId

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

@router.get("/me", response_model=UserInDB)
async def read_current_user(
    current_user: UserInDB = Depends(get_current_active_user)
):
    return current_user

@router.put("/me", response_model=UserInDB)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.id == "admin-static":
        raise HTTPException(status_code=400, detail="Admin profile cannot be updated")

    update_doc = {}
    if user_update.name is not None:
        update_doc["name"] = user_update.name
    if user_update.password:
        update_doc["password_hash"] = get_password_hash(user_update.password)

    if not update_doc:
        return current_user

    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_doc}
    )

    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    return UserInDB(**updated_user)

@router.delete("/me")
async def delete_current_user(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.id == "admin-static":
        raise HTTPException(status_code=400, detail="Admin account cannot be deleted")

    await db.users.delete_one({"_id": ObjectId(current_user.id)})
    return {"message": "Account deleted successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}
