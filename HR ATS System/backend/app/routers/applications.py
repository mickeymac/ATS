from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from app.core.deps import get_current_active_user, check_role, get_db
from app.schemas.job import ApplicationCreate, ApplicationInDB, ApplicationStatus
from app.schemas.user import UserInDB, UserRole
from app.services.resume_extractor import extract_text_from_bytes, extract_candidate_info
from app.services.scoring_engine import evaluate_application_v2
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
import os
import aiofiles
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

async def _enrich_application(app: dict, db: AsyncIOMotorDatabase) -> dict:
    app["_id"] = str(app["_id"])

    status_value = app.get("status", ApplicationStatus.APPLIED)
    if isinstance(status_value, ApplicationStatus):
        status_value = status_value.value
    app["status"] = status_value

    if "score" not in app:
        app["score"] = app.get("final_score", 0.0)

    job_id = app.get("job_id")
    if not app.get("job_title") and job_id and ObjectId.is_valid(job_id):
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if job:
            app["job_title"] = job.get("title")

    return app

@router.post("/upload", response_model=ApplicationInDB)
async def upload_resume(
    job_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """HR/Admin uploads a resume for a job posting."""
    # Check if job exists
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Save file
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    # Read file content ONCE
    file_content = await file.read()
    
    # Save file to disk
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(file_content)
    
    # Extract text and parsed data using the already-read bytes
    extracted_text = ""
    parsed_candidate_data = {}
    
    try:
        # Use extract_text_from_bytes with the content we already have
        extracted_text = extract_text_from_bytes(file_content, file.filename)
        parsed_candidate_data = extract_candidate_info(extracted_text)
        print(f"✓ Successfully extracted {len(extracted_text)} chars from {file.filename}")
        print(f"✓ Parsed data: name={parsed_candidate_data.get('name')}, skills={len(parsed_candidate_data.get('skills', []))}")
    except Exception as e:
        import traceback
        print(f"✗ Resume extraction error: {e}")
        traceback.print_exc()
        extracted_text = ""
        parsed_candidate_data = {}
    
    # Production scoring v2
    try:
        scoring_result = await evaluate_application_v2(
            parsed_candidate_data, 
            extracted_text, 
            job
        )
    except Exception as e:
        import traceback
        print(f"Scoring error: {e}")
        traceback.print_exc()
        scoring_result = {
            "skill_score": 0.0,
            "experience_score": 0.0,
            "education_score": 0.0,
            "semantic_score": 0.0,
            "final_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "skill_coverage": 0.0,
            "breakdown": {}
        }
    
    application_doc = {
        "job_id": job_id,
        "uploaded_by": current_user.id,  # HR/Admin who uploaded the resume
        "job_title": job.get("title"),
        "resume_file_path": file_path,
        "extracted_text": extracted_text,
        
        # Scores (raw 0-100 scale)
        "skill_score": scoring_result.get("skill_score", 0.0),
        "experience_score": scoring_result.get("experience_score", 0.0),
        "education_score": scoring_result.get("education_score", 0.0),
        "semantic_score": scoring_result.get("semantic_score", 0.0),
        "final_score": scoring_result.get("final_score", 0.0),
        
        # Score display format (showing contribution out of max weight)
        # Weights: skill=35%, experience=25%, education=10%, semantic=30%
        "score_display": {
            "skill": f"{round(scoring_result.get('skill_score', 0.0) * 0.35, 1)}/35",
            "experience": f"{round(scoring_result.get('experience_score', 0.0) * 0.25, 1)}/25",
            "education": f"{round(scoring_result.get('education_score', 0.0) * 0.10, 1)}/10",
            "semantic": f"{round(scoring_result.get('semantic_score', 0.0) * 0.30, 1)}/30",
            "total": f"{round(scoring_result.get('final_score', 0.0), 1)}/100"
        },
        
        # Scoring breakdown (actual contribution values)
        "score_breakdown": scoring_result.get("breakdown", {}),
        
        # Skill matching details
        "matched_skills": scoring_result.get("matched_skills", []),
        "missing_skills": scoring_result.get("missing_skills", []),
        "skill_coverage": scoring_result.get("skill_coverage", 0.0),
        
        # Candidate extracted info (flattened for easy querying)
        "candidate_name_extracted": parsed_candidate_data.get("name"),
        "candidate_email": parsed_candidate_data.get("email"),
        "candidate_phone": parsed_candidate_data.get("phone"),
        "candidate_linkedin": parsed_candidate_data.get("linkedin_url"),
        "candidate_github": parsed_candidate_data.get("github_url"),
        "candidate_experience_years": parsed_candidate_data.get("experience_years", 0),
        "candidate_experience_months": parsed_candidate_data.get("experience_months", 0),
        "candidate_education": parsed_candidate_data.get("education", []),
        "candidate_skills": parsed_candidate_data.get("skills", []),
        "candidate_certifications": parsed_candidate_data.get("certifications", []),
        "candidate_summary": parsed_candidate_data.get("summary", ""),
        "extraction_method": parsed_candidate_data.get("extraction_method", "regex"),
        
        "status": ApplicationStatus.APPLIED.value,
        "applied_at": datetime.utcnow()
    }
    
    result = await db.applications.insert_one(application_doc)
    application_doc["_id"] = str(result.inserted_id)
    
    return ApplicationInDB(**application_doc)

@router.get("/", response_model=List[ApplicationInDB])
async def list_applications(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.applications.find()
    apps = []
    async for app in cursor:
        app = await _enrich_application(app, db)
        apps.append(ApplicationInDB(**app))
    return apps

@router.get("/job/{job_id}", response_model=List[ApplicationInDB])
async def get_job_applications(
    job_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.applications.find({"job_id": job_id})
    apps = []
    async for app in cursor:
        app = await _enrich_application(app, db)
        apps.append(ApplicationInDB(**app))
    return apps

@router.put("/{application_id}/status", response_model=ApplicationInDB)
async def update_application_status(
    application_id: str,
    status: ApplicationStatus = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    status_value = status.value if isinstance(status, ApplicationStatus) else status

    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": status_value}}
    )
    
    updated_app = await db.applications.find_one({"_id": ObjectId(application_id)})
    updated_app = await _enrich_application(updated_app, db)
    
    # TODO: Send email notification
    
    return ApplicationInDB(**updated_app)
