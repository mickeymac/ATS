from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.db.mongodb import get_db
from app.schemas.user import UserCreate, UserInDB, Token, UserRole, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
import random
from app.services.email import send_otp_email
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

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    if request.email == settings.ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot reset password for static admin account.")
    
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Prevent email enumeration by returning success even if user not found
        return {"message": "If that email is registered, we have sent a password reset OTP."}
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP to user document
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_otp": otp, "reset_otp_expires_at": expires_at}}
    )
    
    # Send email
    await send_otp_email(request.email, otp)
    
    return {"message": "If that email is registered, we have sent a password reset OTP."}

@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({
        "email": request.email,
        "reset_otp": request.otp
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if "reset_otp_expires_at" not in user or user["reset_otp_expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    return {"message": "OTP verified successfully"}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({
        "email": request.email,
        "reset_otp": request.otp
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if "reset_otp_expires_at" not in user or user["reset_otp_expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    # Update password and clear OTP
    new_password_hash = get_password_hash(request.new_password)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_password_hash},
            "$unset": {"reset_otp": "", "reset_otp_expires_at": ""}
        }
    )
    
    return {"message": "Password reset successfully"}
