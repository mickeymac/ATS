from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class InterviewSchedule(BaseModel):
    candidate_name: str
    candidate_email: EmailStr
    start_time: str # Format expected ISO 8601 string
    duration: int
    application_id: Optional[str] = None

class InterviewResponse(BaseModel):
    success: bool
    link: Optional[str] = None
    interview: Optional[dict] = None
    error: Optional[str] = None

class InterviewUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
