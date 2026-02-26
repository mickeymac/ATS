from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List
from app.core.deps import get_current_active_user, check_role, get_db
from app.schemas.job import JobCreate, JobInDB, JobBase
from app.schemas.user import UserInDB, UserRole
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=JobInDB)
async def create_job(
    job_in: JobCreate,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    job_doc = job_in.dict()
    job_doc["created_by"] = current_user.id
    job_doc["created_at"] = datetime.utcnow()
    
    result = await db.jobs.insert_one(job_doc)
    job_doc["_id"] = str(result.inserted_id)
    return JobInDB(**job_doc)

@router.get("/", response_model=List[JobInDB])
async def read_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.jobs.find().skip(skip).limit(limit)
    jobs = []
    async for job in cursor:
        job["_id"] = str(job["_id"])
        jobs.append(JobInDB(**job))
    return jobs

@router.get("/{job_id}", response_model=JobInDB)
async def read_job(job_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["_id"] = str(job["_id"])
    return JobInDB(**job)

@router.put("/{job_id}", response_model=JobInDB)
async def update_job(
    job_id: str,
    job_update: JobCreate,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Optional: Check if HR owns the job
    if current_user.role == UserRole.HR and job["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": job_update.dict()})
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["_id"] = str(updated_job["_id"])
    return JobInDB(**updated_job)

@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.HR])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role == UserRole.HR and job["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
        
    await db.jobs.delete_one({"_id": ObjectId(job_id)})
    return {"message": "Job deleted successfully"}
