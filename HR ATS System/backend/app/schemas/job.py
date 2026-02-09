from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from enum import Enum

class ApplicationStatus(str, Enum):
    APPLIED = "Applied"
    UNDER_REVIEW = "Under Review"
    SHORTLISTED = "Shortlisted"
    INTERVIEW_SCHEDULED = "Interview Scheduled"
    SELECTED = "Selected"
    REJECTED = "Rejected"

class JobBase(BaseModel):
    title: str
    description: str
    required_skills: List[str]
    experience_required: int # in years

class JobCreate(JobBase):
    pass

class JobInDB(JobBase):
    id: str = Field(alias="_id")
    created_by: str # User ID of HR/Admin
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ApplicationBase(BaseModel):
    job_id: str

class ApplicationCreate(ApplicationBase):
    candidate_id: str
    resume_file_path: str
    extracted_text: Optional[str] = None

class ApplicationInDB(ApplicationCreate):
    id: str = Field(alias="_id")
    rule_score: float = 0.0
    semantic_score: float = 0.0
    final_score: float = 0.0
    status: str = "Applied"
    applied_at: datetime = Field(default_factory=datetime.utcnow)
