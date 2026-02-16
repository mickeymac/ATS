from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from enum import Enum

class ApplicationStatus(str, Enum):
    APPLIED = "Applied"
    UNDER_REVIEW = "Under Review"
    SHORTLISTED = "Shortlisted"
    INTERVIEW_SCHEDULED = "Interview Scheduled"
    SELECTED = "Selected"
    REJECTED = "Rejected"

class SkillWeight(BaseModel):
    name: str
    weight: float

class JobBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    type: Optional[str] = None
    salary: Optional[str] = None
    required_skills: List[str] = []
    weighted_skills: Optional[List[SkillWeight]] = None
    experience_required: int = 0 # in years
    education_required: Optional[str] = None # e.g., "Bachelor"

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
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    scoring: Optional[Dict[str, Any]] = None
    rule_score: float = 0.0
    semantic_score: float = 0.0
    final_score: float = 0.0
    score: float = 0.0
    ranking_position: Optional[int] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED
    applied_at: datetime = Field(default_factory=datetime.utcnow)

