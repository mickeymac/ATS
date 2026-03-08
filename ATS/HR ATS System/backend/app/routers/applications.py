from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, Query
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
import hashlib

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
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
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
    
    # Generate file hash for duplicate detection
    file_hash = hashlib.md5(file_content).hexdigest()
    
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
    
    # Check for duplicate resume (same candidate email for same job)
    candidate_email = parsed_candidate_data.get("email")
    if candidate_email:
        existing_app = await db.applications.find_one({
            "job_id": job_id,
            "candidate_email": candidate_email
        })
        if existing_app:
            # Clean up uploaded file since it's a duplicate
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=400, 
                detail=f"A resume for candidate with email '{candidate_email}' already exists for this job"
            )
    
    # Also check by file hash to detect exact duplicate files
    existing_by_hash = await db.applications.find_one({
        "job_id": job_id,
        "file_hash": file_hash
    })
    if existing_by_hash:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail="This exact resume file has already been uploaded for this job"
        )
    
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
        
        # File hash for duplicate detection
        "file_hash": file_hash,
        
        # Review workflow fields
        "review_status": "pending",
        "review_batch_id": None,
        "sent_for_review_at": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "comments": [],
        
        "status": ApplicationStatus.APPLIED.value,
        "applied_at": datetime.utcnow()
    }
    
    result = await db.applications.insert_one(application_doc)
    application_doc["_id"] = str(result.inserted_id)
    
    return ApplicationInDB(**application_doc)

@router.get("/")
async def list_applications(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search by candidate name, email, or job title"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    review_status: Optional[str] = Query(None, description="Filter by review status"),
    sort_by: Optional[str] = Query("applied_at", description="Sort field (applied_at, final_score, candidate_name_extracted)"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc or desc)"),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List applications with pagination, search, and filtering."""
    # Build query filter
    query_filter = {}
    
    if job_id:
        query_filter["job_id"] = job_id
    
    if review_status:
        query_filter["review_status"] = review_status
    
    if search:
        # Case-insensitive search on multiple fields
        query_filter["$or"] = [
            {"candidate_name_extracted": {"$regex": search, "$options": "i"}},
            {"candidate_email": {"$regex": search, "$options": "i"}},
            {"job_title": {"$regex": search, "$options": "i"}}
        ]
    
    # Get total count for pagination
    total_count = await db.applications.count_documents(query_filter)
    
    # Determine sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Execute query with pagination and sorting
    cursor = db.applications.find(query_filter).sort(sort_by, sort_direction).skip(skip).limit(limit)
    
    apps = []
    async for app in cursor:
        app = await _enrich_application(app, db)
        apps.append(ApplicationInDB(**app))
    
    return {
        "items": apps,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/job/{job_id}")
async def get_job_applications(
    job_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, description="Search by candidate name or email"),
    review_status: Optional[str] = Query(None),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get applications for a specific job with pagination and search."""
    query_filter = {"job_id": job_id}
    
    if review_status:
        query_filter["review_status"] = review_status
    
    if search:
        query_filter["$or"] = [
            {"candidate_name_extracted": {"$regex": search, "$options": "i"}},
            {"candidate_email": {"$regex": search, "$options": "i"}}
        ]
    
    total_count = await db.applications.count_documents(query_filter)
    cursor = db.applications.find(query_filter).sort("applied_at", -1).skip(skip).limit(limit)
    
    apps = []
    async for app in cursor:
        app = await _enrich_application(app, db)
        apps.append(ApplicationInDB(**app))
    
    return {
        "items": apps,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.put("/{application_id}/status", response_model=ApplicationInDB)
async def update_application_status(
    application_id: str,
    status: ApplicationStatus = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
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


@router.get("/my-uploads", response_model=List[ApplicationInDB])
async def get_my_uploads(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get applications uploaded by the current logged-in user."""
    cursor = db.applications.find({"uploaded_by": current_user.id})
    apps = []
    async for app in cursor:
        app = await _enrich_application(app, db)
        apps.append(ApplicationInDB(**app))
    return apps


@router.get("/my-stats")
async def get_my_stats(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get upload statistics for the current logged-in user (today, week, month, year)."""
    from datetime import timedelta
    
    now = datetime.utcnow()
    
    # Calculate time boundaries
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_today - timedelta(days=now.weekday())  # Monday
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Count uploads for each period
    today_count = await db.applications.count_documents({
        "uploaded_by": current_user.id,
        "applied_at": {"$gte": start_of_today}
    })
    
    week_count = await db.applications.count_documents({
        "uploaded_by": current_user.id,
        "applied_at": {"$gte": start_of_week}
    })
    
    month_count = await db.applications.count_documents({
        "uploaded_by": current_user.id,
        "applied_at": {"$gte": start_of_month}
    })
    
    year_count = await db.applications.count_documents({
        "uploaded_by": current_user.id,
        "applied_at": {"$gte": start_of_year}
    })
    
    total_count = await db.applications.count_documents({
        "uploaded_by": current_user.id
    })
    
    return {
        "today": today_count,
        "week": week_count,
        "month": month_count,
        "year": year_count,
        "total": total_count
    }


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete an application. Recruiters can only delete their own uploads."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")
    
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check permission: Admin can delete any, others can only delete their own uploads
    if current_user.role != UserRole.ADMIN and app.get("uploaded_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this application")
    
    # Check if application is already in review process
    if app.get("review_status") == "sent_for_review":
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete application that is currently under review"
        )
    
    # Delete the resume file from disk
    resume_path = app.get("resume_file_path")
    if resume_path and os.path.exists(resume_path):
        try:
            os.remove(resume_path)
        except Exception as e:
            print(f"Warning: Could not delete resume file {resume_path}: {e}")
    
    # Delete the application from database
    await db.applications.delete_one({"_id": ObjectId(application_id)})
    
    return {"success": True, "message": "Application deleted successfully"}


@router.post("/bulk-delete")
async def bulk_delete_applications(
    application_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Bulk delete multiple applications."""
    if not application_ids:
        raise HTTPException(status_code=400, detail="No application IDs provided")
    
    deleted_count = 0
    skipped_count = 0
    errors = []
    
    for app_id in application_ids:
        if not ObjectId.is_valid(app_id):
            errors.append(f"Invalid ID: {app_id}")
            skipped_count += 1
            continue
        
        app = await db.applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            errors.append(f"Not found: {app_id}")
            skipped_count += 1
            continue
        
        # Check permission
        if current_user.role != UserRole.ADMIN and app.get("uploaded_by") != current_user.id:
            errors.append(f"Not authorized: {app_id}")
            skipped_count += 1
            continue
        
        # Skip if under review
        if app.get("review_status") == "sent_for_review":
            errors.append(f"Under review: {app_id}")
            skipped_count += 1
            continue
        
        # Delete resume file
        resume_path = app.get("resume_file_path")
        if resume_path and os.path.exists(resume_path):
            try:
                os.remove(resume_path)
            except Exception:
                pass
        
        # Delete from database
        await db.applications.delete_one({"_id": ObjectId(app_id)})
        deleted_count += 1
    
    return {
        "success": True,
        "deleted": deleted_count,
        "skipped": skipped_count,
        "errors": errors if errors else None
    }
