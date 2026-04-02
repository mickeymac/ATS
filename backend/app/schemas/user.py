from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
import re

class UserRole(str, Enum):
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    RECRUITER = "recruiter"

# Default permissions for each role
DEFAULT_PERMISSIONS = {
    "admin": {
        "can_create_jobs": True,
        "can_delete_jobs": True,
        "can_activate_jobs": True,
        "can_assign_jobs": True,
        "can_self_assign_recruiters": True,
        "can_send_interview_invites": True,
        "can_export_data": True,
        "can_manage_users": True,
        "can_manage_permissions": True,
    },
    "team_lead": {
        "can_create_jobs": False,
        "can_delete_jobs": False,
        "can_activate_jobs": True,
        "can_assign_jobs": False,
        "can_self_assign_recruiters": True,
        "can_send_interview_invites": True,
        "can_export_data": True,
        "can_manage_users": False,
        "can_manage_permissions": False,
    },
    "recruiter": {
        "can_create_jobs": False,
        "can_delete_jobs": False,
        "can_activate_jobs": False,
        "can_assign_jobs": False,
        "can_self_assign_recruiters": False,
        "can_send_interview_invites": False,
        "can_export_data": False,
        "can_manage_users": False,
        "can_manage_permissions": False,
    }
}

class UserPermissions(BaseModel):
    """User permission flags."""
    can_create_jobs: bool = False
    can_delete_jobs: bool = False
    can_activate_jobs: bool = False
    can_assign_jobs: bool = False
    can_self_assign_recruiters: bool = False
    can_send_interview_invites: bool = False
    can_export_data: bool = False
    can_manage_users: bool = False
    can_manage_permissions: bool = False

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.RECRUITER

class UserCreate(UserBase):
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    team_lead: Optional[str] = None
    team_lead_id: Optional[str] = None  # For recruiter assignment to team lead
    permissions: Optional[Dict[str, bool]] = None  # Custom permission overrides
    password: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        return v

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    password_hash: str
    phone: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    team_lead: Optional[str] = None
    team_lead_id: Optional[str] = None  # For recruiters: their assigned team lead
    permissions: Optional[Dict[str, bool]] = None  # Custom permissions
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        extra = "ignore"
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        # Admin always has all permissions
        if self.role == UserRole.ADMIN:
            return True
        
        # Check custom permissions first
        if self.permissions and permission in self.permissions:
            return self.permissions[permission]
        
        # Fall back to default permissions for role
        role_defaults = DEFAULT_PERMISSIONS.get(self.role.value, {})
        return role_defaults.get(permission, False)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        return v
