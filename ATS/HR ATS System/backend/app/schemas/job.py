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

class ReviewStatus(str, Enum):
    """Review workflow status for Team Lead review process."""
    PENDING = "pending"                # Fresh upload, not sent for review
    SENT_FOR_REVIEW = "sent_for_review" # Recruiter sent to Team Lead
    APPROVED = "approved"              # Team Lead approved
    NOT_SELECTED = "not_selected"      # Team Lead did not select
    
class Comment(BaseModel):
    """Comment added by user during review process."""
    user_id: str
    user_name: str
    user_role: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    uploaded_by: Optional[str] = None  # HR/Admin who uploaded the resume
    resume_file_path: str
    extracted_text: Optional[str] = None

class CandidateExtractedData(BaseModel):
    """Structured candidate data extracted from resume using LLM."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    skills: List[str] = []
    experience_years: float = 0.0
    experience_months: int = 0
    education: List[str] = []
    certifications: List[str] = []
    summary: Optional[str] = None
    extraction_method: Optional[str] = None  # "llm" or "regex"

class ScoringBreakdown(BaseModel):
    """Detailed scoring breakdown."""
    skill_score: float = 0.0
    experience_score: float = 0.0
    education_score: float = 0.0
    semantic_score: float = 0.0
    final_score: float = 0.0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    skill_coverage: float = 0.0
    experience_match: float = 0.0
    breakdown: Optional[Dict[str, float]] = None

class ApplicationInDB(ApplicationCreate):
    id: str = Field(alias="_id")
    job_title: Optional[str] = None
    
    # Score fields (0-100 scale)
    skill_score: float = 0.0
    experience_score: float = 0.0
    education_score: float = 0.0
    semantic_score: float = 0.0
    final_score: float = 0.0
    
    # Score display (X/Y format showing contribution out of max weight)
    score_display: Optional[Dict[str, str]] = None
    
    # Score breakdown (actual weighted contributions)
    score_breakdown: Optional[Dict[str, float]] = None
    
    # Skill matching details
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    skill_coverage: float = 0.0
    
    # Candidate extracted info (flattened for easy querying)
    candidate_name_extracted: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_linkedin: Optional[str] = None
    candidate_github: Optional[str] = None
    candidate_experience_years: float = 0.0
    candidate_experience_months: int = 0
    candidate_education: List[str] = []
    candidate_skills: List[str] = []
    candidate_certifications: List[str] = []
    candidate_summary: Optional[str] = None
    extraction_method: Optional[str] = None  # "llm" or "regex"
    
    # Review workflow fields
    review_status: str = "pending"  # pending, sent_for_review, approved, not_selected
    review_batch_id: Optional[str] = None  # Groups candidates sent together
    sent_for_review_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None  # Team Lead user ID
    comments: List[Comment] = []
    
    # Other fields
    ranking_position: Optional[int] = None
    status: ApplicationStatus = ApplicationStatus.APPLIED
    applied_at: datetime = Field(default_factory=datetime.utcnow)

