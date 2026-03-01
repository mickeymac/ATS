from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.core.security import create_access_token
from app.db.mongodb import get_db
from app.schemas.user import TokenData, UserInDB, UserRole
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_db)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role") # custom claim
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise credentials_exception
    
    if token_data.email == settings.ADMIN_EMAIL and token_data.role == UserRole.ADMIN.value:
        return UserInDB(
            **{
                "_id": "admin-static",
                "email": settings.ADMIN_EMAIL,
                "name": "Admin",
                "role": UserRole.ADMIN,
                "password_hash": "",
                "created_at": datetime.utcnow(),
            }
        )

    user = await db.users.find_one({"email": token_data.email})
    if user is None:
        raise credentials_exception
    
    user["_id"] = str(user["_id"])
    return UserInDB(**user)

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    return current_user

def check_role(required_roles: list[UserRole]):
    def role_checker(current_user: UserInDB = Depends(get_current_active_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker
