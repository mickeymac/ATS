from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    """Types of notifications in the system."""
    REVIEW_REQUEST = "review_request"       # Recruiter sent candidates for review
    REVIEW_COMPLETED = "review_completed"   # Team Lead completed review
    COMMENT_ADDED = "comment_added"         # Someone added a comment


class NotificationBase(BaseModel):
    """Base notification model."""
    user_id: str                            # User who receives the notification
    type: NotificationType                  # Type of notification
    title: str                              # Short title
    message: str                            # Full message
    data: Optional[Dict[str, Any]] = None   # Additional data (batch_id, recruiter_name, etc.)


class NotificationCreate(NotificationBase):
    """Model for creating a notification."""
    pass


class NotificationInDB(NotificationBase):
    """Notification as stored in database."""
    id: str = Field(alias="_id")
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class ReviewBatch(BaseModel):
    """A batch of applications sent for review."""
    id: str = Field(alias="_id")
    recruiter_id: str
    recruiter_name: str
    team_lead_id: str
    application_ids: list[str]
    candidate_count: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, completed
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
