from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    RECRUITER = "recruiter"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.RECRUITER

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    team_lead: Optional[str] = None
    password: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    password_hash: str
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    team_lead: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        extra = "ignore"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
