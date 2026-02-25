from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
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
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Add role to token
    to_encode = {"sub": user_in.email, "role": user_in.role}
    # We need to modify create_access_token to accept claims or handle it differently
    # Let's override the subject in create_access_token or just use logic here
    # Since create_access_token in security.py takes "subject" which usually is ID or Email.
    # We'll encode extra claims manually or modify security.py. 
    # Actually, let's fix security.py in next step if needed, or just update logic here.
    
    # Wait, security.py `create_access_token` takes `subject`. 
    # Let's assume we modify `create_access_token` to accept extra data or we just modify `security.py` later.
    # For now, let's re-implement token creation here locally or update security.py.
    # To keep it clean, I will update security.py to support custom claims.
    
    # For now, I'll just use the existing function but I need to pass the role.
    # The existing function: to_encode = {"exp": expire, "sub": str(subject)}
    # I will modify security.py to allow extra claims.
    
    # But wait, I can't modify it easily in the middle of this thought process without another tool call.
    # I will use a temporary local implementation or just proceed and fix security.py after.
    # Let's fix security.py AFTER this tool call.
    
    access_token = create_access_token(
        subject=user_in.email,
        expires_delta=access_token_expires,
        additional_claims={"role": user_in.role.value},
    )
    
    # Wait, if I don't put role in token, `get_current_user` will fail to extract it?
    # `get_current_user` tries to get "role" from payload.
    # So I MUST put role in token.
    
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
            additional_claims={"role": UserRole.ADMIN.value},
        )
        return {"access_token": access_token, "token_type": "bearer", "role": UserRole.ADMIN.value}

    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reject candidate role logins - only HR and Admin allowed
    if user.get("role") == "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate accounts are no longer supported. Please contact HR.",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # We need to inject role into the token.
    # I'll rely on the updated security.py which I will write immediately.
    
    access_token = create_access_token(
        subject=user["email"], expires_delta=access_token_expires, additional_claims={"role": user["role"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}

from datetime import datetime
