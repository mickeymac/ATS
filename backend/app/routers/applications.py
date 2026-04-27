from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, Query
from fastapi.responses import StreamingResponse, FileResponse
from typing import List, Optional
from app.core.deps import get_current_active_user, check_role, get_db
from app.schemas.job import ApplicationCreate, ApplicationInDB, ApplicationStatus
from app.schemas.user import UserInDB, UserRole
from app.services.resume_extractor import extract_text_from_bytes, extract_profile_picture_from_pdf
from app.services.smart_extractor import smart_extract_candidate_info
from app.services.scoring_engine import evaluate_application_v2
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
import os
import aiofiles
import uuid
import hashlib
import time
from app.services.b2_storage_service import upload_resume_to_b2, delete_resume_from_b2

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

    # Sanitize fields that might mistakenly be stored as lists
    for field in ["candidate_email", "candidate_phone", "candidate_name_extracted"]:
        if isinstance(app.get(field), list):
            app[field] = str(app[field][0]) if app[field] else None
            
    # Sanitize lists containing null/None values from LLM extractions
    for list_field in ["candidate_skills", "candidate_education", "matched_skills", "missing_skills"]:
        if isinstance(app.get(list_field), list):
            app[list_field] = [x for x in app[list_field] if x is not None]

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

    # Read file content ONCE
    file_content = await file.read()
    
    # Validate file type and size
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ["pdf", "doc", "docx"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, and DOCX files are allowed.")
        
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
    
    # Generate file hash for duplicate detection
    file_hash = hashlib.md5(file_content).hexdigest()
    
    # Check by file hash to detect exact duplicate files early
    existing_by_hash = await db.applications.find_one({
        "job_id": job_id,
        "file_hash": file_hash
    })
    if existing_by_hash:
        raise HTTPException(
            status_code=400,
            detail="This exact resume file has already been uploaded for this job"
        )
    
    # Extract text and parsed data using the bytes
    extracted_text = ""
    parsed_candidate_data = {}
    
    try:
        # Use extract_text_from_bytes with the content we already have
        extracted_text = extract_text_from_bytes(file_content, file.filename)
        
        # Use Smart Extractor (3-tier: LlamaParse+Groq -> Mistral7B -> Regex)
        parsed_candidate_data = await smart_extract_candidate_info(
            file_content=file_content,
            filename=file.filename,
            resume_text=extracted_text
        )
        
        extraction_tier = parsed_candidate_data.get('extraction_tier', 0)
        extraction_method = parsed_candidate_data.get('extraction_method', 'unknown')
        tier_names = {1: 'LlamaParse+Groq', 2: 'Mistral 7B', 3: 'Regex', 0: 'Failed'}
        
        print(f"✓ Successfully extracted {len(extracted_text)} chars from {file.filename}")
        print(f"✓ Extraction Tier: {extraction_tier} ({tier_names.get(extraction_tier, 'Unknown')})")
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
            raise HTTPException(
                status_code=400, 
                detail=f"A resume for candidate with email '{candidate_email}' already exists for this job"
            )
            
    # Build safely formatted filename for Drive
    candidate_name = parsed_candidate_data.get("name")
    if candidate_name:
        safe_name = "".join([c if c.isalpha() or c.isdigit() else "_" for c in candidate_name]).strip("_").lower()
    else:
        safe_name = "unknown_candidate"
        
    timestamp = int(time.time())
    drive_filename = f"{safe_name}_{timestamp}.{file_ext}"
    
    # Extract & Upload Profile Picture
    profile_image_url = None
    if file_ext == "pdf":
        try:
            profile_pic_bytes = extract_profile_picture_from_pdf(file_content)
            if profile_pic_bytes:
                pic_filename = f"{safe_name}_{timestamp}_profile.jpg"
                _, profile_image_url = await upload_resume_to_b2(profile_pic_bytes, pic_filename, "image/jpeg")
                print(f"✓ Profile picture extracted and uploaded: {profile_image_url}")
        except Exception as e:
            print(f"✗ Profile picture extraction/upload error: {e}")
            
    # Upload to Backblaze B2
    try:
        if file_ext == "pdf":
            drive_mime = "application/pdf"
        elif file_ext == "doc":
            drive_mime = "application/msword"
        else:
            drive_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
        file_name, file_url = await upload_resume_to_b2(file_content, drive_filename, drive_mime)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"B2 upload failed: {str(e)}")
    
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
        "file_name": file_name,
        "resume_url": file_url,
        "profile_image_url": profile_image_url,
        "extracted_text": extracted_text,
        
        # Scores (raw 0-100 scale)
        "skill_score": scoring_result.get("skill_score", 0.0),
        "experience_score": scoring_result.get("experience_score", 0.0),
        "education_score": scoring_result.get("education_score", 0.0),
        "final_score": scoring_result.get("final_score", 0.0),
        
        # Score display format (showing contribution out of max weight)
        # Weights: skill=50%, experience=35%, education=15%
        "score_display": {
            "skill": f"{round(scoring_result.get('skill_score', 0.0) * 0.50, 1)}/50",
            "experience": f"{round(scoring_result.get('experience_score', 0.0) * 0.35, 1)}/35",
            "education": f"{round(scoring_result.get('education_score', 0.0) * 0.15, 1)}/15",
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
        "extraction_tier": parsed_candidate_data.get("extraction_tier", 3),
        
        # NEW: Rich extraction data from Smart Extractor
        "experience_details": parsed_candidate_data.get("experience_details", []),
        "domain_experience": parsed_candidate_data.get("domain_experience", []),
        "awards": parsed_candidate_data.get("awards", []),
        "education_details": parsed_candidate_data.get("education_details", []),
        
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

@router.get("/{application_id}/resume")
async def download_resume(
    application_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Fetch the resume directly from Backblaze B2 (or local fallback) and proxy it securely."""
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID")
        
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Proxy from B2
    file_name = app.get("file_name")
    if file_name:
        from app.services.b2_storage_service import get_b2_client
        import botocore
        from app.core.config import settings
        
        b2_client = get_b2_client()
        try:
            response = b2_client.get_object(Bucket=settings.B2_BUCKET_NAME, Key=f"resumes/{file_name}")
            return StreamingResponse(response['Body'], media_type=response.get('ContentType', 'application/pdf'))
        except botocore.exceptions.ClientError as e:
            print(f"B2 Fetch Error: {e}")
            raise HTTPException(status_code=404, detail="Resume file not found in cloud storage")
            
    # Fallback to legacy local
    resume_path = app.get("resume_file_path")
    if resume_path and os.path.exists(resume_path):
        return FileResponse(resume_path)
        
    raise HTTPException(status_code=404, detail="Resume file is not available")

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
    
    # Delete the resume file from B2
    file_name = app.get("file_name")
    if file_name:
        try:
            await delete_resume_from_b2(file_name)
        except Exception as e:
            print(f"Warning: Could not delete resume file from B2 {file_name}: {e}")
            
    # As a fallback, try to delete the old local format if it exists
    resume_path = app.get("resume_file_path")
    if resume_path and os.path.exists(resume_path):
        try:
            os.remove(resume_path)
        except Exception as e:
            print(f"Warning: Could not delete old resume file {resume_path}: {e}")
    
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
        
        # Delete from B2
        file_name = app.get("file_name")
        if file_name:
            try:
                await delete_resume_from_b2(file_name)
            except Exception:
                pass
                
        # Delete old local resume file if exists
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
