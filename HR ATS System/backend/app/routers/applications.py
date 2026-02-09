from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from app.core.deps import get_current_active_user, check_role, get_db
from app.schemas.job import ApplicationCreate, ApplicationInDB, ApplicationStatus
from app.schemas.user import UserInDB, UserRole
from app.services.resume_parser import extract_text_from_file
from app.services.ai_scoring import evaluate_application
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

@router.post("/apply", response_model=ApplicationInDB)
async def apply_for_job(
    job_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(check_role([UserRole.CANDIDATE])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Check if job exists
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Check if already applied
    existing_application = await db.applications.find_one({
        "job_id": job_id,
        "candidate_id": current_user.id
    })
    if existing_application:
        raise HTTPException(status_code=400, detail="You have already applied for this job")

    # Save file
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read() # Read once
        await out_file.write(content)
        file.seek(0) # Reset for parsing
    
    # Extract text (graceful fallback)
    try:
        extracted_text = await extract_text_from_file(file)
    except Exception:
        extracted_text = ""
        
    # AI Scoring
    scores = await evaluate_application(
        extracted_text, 
        job.get("description", ""), 
        job.get("required_skills", [])
    )
    
    application_doc = {
        "job_id": job_id,
        "candidate_id": current_user.id,
        "resume_file_path": file_path,
        "extracted_text": extracted_text,
        "rule_score": scores["rule_score"],
        "semantic_score": scores["semantic_score"],
        "final_score": scores["final_score"],
        "status": ApplicationStatus.APPLIED,
        "applied_at": datetime.utcnow()
    }
    
    result = await db.applications.insert_one(application_doc)
    application_doc["_id"] = str(result.inserted_id)
    
    return ApplicationInDB(**application_doc)

@router.get("/job/{job_id}", response_model=List[ApplicationInDB])
async def get_job_applications(
    job_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.applications.find({"job_id": job_id})
    apps = []
    async for app in cursor:
        app["_id"] = str(app["_id"])
        apps.append(ApplicationInDB(**app))
    return apps

@router.get("/my-applications", response_model=List[ApplicationInDB])
async def get_my_applications(
    current_user: UserInDB = Depends(check_role([UserRole.CANDIDATE])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.applications.find({"candidate_id": current_user.id})
    apps = []
    async for app in cursor:
        app["_id"] = str(app["_id"])
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
        
    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": status}}
    )
    
    updated_app = await db.applications.find_one({"_id": ObjectId(application_id)})
    updated_app["_id"] = str(updated_app["_id"])
    
    # TODO: Send email notification
    
    return ApplicationInDB(**updated_app)
