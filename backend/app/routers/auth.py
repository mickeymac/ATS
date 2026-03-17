from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.db.mongodb import get_db
from app.schemas.user import UserCreate, UserInDB, Token, UserRole
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    user_doc = user_in.dict()
    user_doc["password_hash"] = get_password_hash(user_in.password)
    del user_doc["password"]
    user_doc["created_at"] = datetime.utcnow() # Helper needed or direct usage
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Include user_id in token for Socket.IO room targeting
    access_token = create_access_token(
        subject=user_in.email,
        expires_delta=access_token_expires,
        additional_claims={"role": user_in.role.value, "user_id": user_id},
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user_in.role}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncIOMotorDatabase = Depends(get_db)):
    if form_data.username == settings.ADMIN_EMAIL:
        if form_data.password != settings.ADMIN_PASSWORD:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=settings.ADMIN_EMAIL,
            expires_delta=access_token_expires,
            additional_claims={"role": UserRole.ADMIN.value, "user_id": "admin-static"},
        )
        return {"access_token": access_token, "token_type": "bearer", "role": UserRole.ADMIN.value}

    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Include user_id in token for Socket.IO room targeting
    
    access_token = create_access_token(
        subject=user["email"], 
        expires_delta=access_token_expires, 
        additional_claims={"role": user["role"], "user_id": str(user["_id"])}
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}

from datetime import datetime
