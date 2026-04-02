from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MessageBase(BaseModel):
    message_text: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    file_name: Optional[str] = None

class MessageCreate(MessageBase):
    receiver_id: str
    group_id: Optional[str] = None

class MessageResponse(MessageBase):
    id: str = Field(alias="_id")
    sender_id: str
    receiver_id: Optional[str] = None
    group_id: Optional[str] = None
    timestamp: datetime
    is_read: bool
    is_deleted_for_everyone: bool = False
    deleted_for: List[str] = []

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    members: List[str]
    admins: Optional[List[str]] = []
    profile_image: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    profile_image: Optional[str] = None

class GroupResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: Optional[str] = None
    members: List[str]
    admins: List[str]
    profile_image: Optional[str] = None
    created_by: str
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ChatContact(BaseModel):
    id: str
    name: str
    email: Optional[str] = ""
    profile_image: Optional[str] = None
    is_online: bool = False
    last_seen: Optional[datetime] = None
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    type: str = "user" # "user" or "group"
    admins: Optional[List[str]] = []

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
