from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Optional
from app.core.deps import get_current_active_user, check_role, check_permission, get_db
from app.schemas.job import JobCreate, JobInDB, JobBase, JobUpdate
from app.schemas.user import UserInDB, UserRole
from app.schemas.notification import NotificationType
from app.services.socket_manager import emit_notification, emit_job_created, emit_job_status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

router = APIRouter()


async def _create_notification(
    db: AsyncIOMotorDatabase,
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    data: dict = None
):
    """Helper to create a notification."""
    notification_doc = {
        "user_id": user_id,
        "type": notification_type.value,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification_doc)


async def _get_all_admin_ids(db: AsyncIOMotorDatabase) -> list:
    """Get all admin user IDs from database."""
    admins = []
    cursor = db.users.find({"role": "admin"})
    async for user in cursor:
        admins.append(str(user["_id"]))
    return admins

@router.post("/", response_model=JobInDB)
async def create_job(
    job_in: JobCreate,
    current_user: UserInDB = Depends(check_permission("can_create_jobs")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new job. Requires can_create_jobs permission."""
    job_doc = job_in.dict()
    job_doc["created_by"] = current_user.id
    job_doc["created_by_name"] = current_user.name or current_user.email
    job_doc["created_at"] = datetime.utcnow()
    job_doc["is_active"] = True
    job_doc["status_changed_by"] = None
    job_doc["status_changed_by_name"] = None
    job_doc["status_changed_at"] = None
    job_doc["assigned_team_lead_id"] = None
    job_doc["assigned_recruiter_ids"] = []
    
    # If Team Lead creates job, auto-assign themselves
    if current_user.role == UserRole.TEAM_LEAD:
        job_doc["assigned_team_lead_id"] = current_user.id
    
    result = await db.jobs.insert_one(job_doc)
    job_doc["_id"] = str(result.inserted_id)
    
    # Notify all admins when Team Lead creates a job
    if current_user.role == UserRole.TEAM_LEAD:
        admin_ids = await _get_all_admin_ids(db)
        for admin_id in admin_ids:
            await _create_notification(
                db,
                admin_id,
                NotificationType.JOB_CREATED,
                "New Job Created",
                f"{current_user.name or current_user.email} has created a new job: {job_in.title}",
                {
                    "job_id": job_doc["_id"],
                    "job_title": job_in.title,
                    "created_by": current_user.id,
                    "created_by_name": current_user.name or current_user.email
                }
            )
            # Emit socket notification
            await emit_notification(admin_id, {
                "type": NotificationType.JOB_CREATED.value,
                "title": "New Job Created",
                "message": f"{current_user.name or current_user.email} has created a new job: {job_in.title}",
                "data": {
                    "job_id": job_doc["_id"],
                    "job_title": job_in.title
                }
            })
    
    # Emit job created event for real-time updates
    await emit_job_created({
        "job_id": job_doc["_id"],
        "title": job_in.title,
        "created_by": current_user.id,
        "created_by_name": current_user.name or current_user.email
    })
    
    return JobInDB(**job_doc)

@router.get("/")
async def read_jobs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    search: Optional[str] = Query(None, description="Search by job title or description"),
    location: Optional[str] = Query(None, description="Filter by location"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List jobs with pagination and search."""
    # Build query filter
    query_filter = {}
    
    if search:
        query_filter["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if location:
        query_filter["location"] = {"$regex": location, "$options": "i"}
    
    if job_type:
        query_filter["type"] = job_type
    
    # Get total count
    total_count = await db.jobs.count_documents(query_filter)
    
    # Execute query
    cursor = db.jobs.find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
    
    jobs = []
    async for job in cursor:
        job["_id"] = str(job["_id"])
        jobs.append(JobInDB(**job))
    
    return {
        "items": jobs,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

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
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if Team Lead or Recruiter owns the job
    if current_user.role in [UserRole.TEAM_LEAD, UserRole.RECRUITER] and job["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": job_update.dict()})
    
    updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated_job["_id"] = str(updated_job["_id"])
    return JobInDB(**updated_job)

@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    current_user: UserInDB = Depends(check_permission("can_delete_jobs")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a job. Requires can_delete_jobs permission."""
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Non-admin users can only delete jobs they created
    if current_user.role != UserRole.ADMIN and job["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
        
    await db.jobs.delete_one({"_id": ObjectId(job_id)})
    return {"message": "Job deleted successfully"}


@router.post("/bulk-delete")
async def bulk_delete_jobs(
    job_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_permission("can_delete_jobs")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Bulk delete multiple jobs. Also deletes associated applications. Requires can_delete_jobs permission."""
    if not job_ids:
        raise HTTPException(status_code=400, detail="No job IDs provided")
    
    deleted_count = 0
    skipped_count = 0
    errors = []
    
    for job_id in job_ids:
        if not ObjectId.is_valid(job_id):
            errors.append(f"Invalid ID: {job_id}")
            skipped_count += 1
            continue
        
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            errors.append(f"Not found: {job_id}")
            skipped_count += 1
            continue
        
        # Check permission - non-admin can only delete their own jobs
        if current_user.role != UserRole.ADMIN and job["created_by"] != current_user.id:
            errors.append(f"Not authorized: {job_id}")
            skipped_count += 1
            continue
        
        # Delete associated applications first
        await db.applications.delete_many({"job_id": job_id})
        
        # Delete the job
        await db.jobs.delete_one({"_id": ObjectId(job_id)})
        deleted_count += 1
    
    return {
        "success": True,
        "deleted": deleted_count,
        "skipped": skipped_count,
        "errors": errors if errors else None
    }


@router.put("/{job_id}/toggle-active")
async def toggle_job_active(
    job_id: str,
    current_user: UserInDB = Depends(check_permission("can_activate_jobs")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Toggle job activation status. Requires can_activate_jobs permission."""
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    current_status = job.get("is_active", True)
    new_status = not current_status
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {
            "is_active": new_status,
            "status_changed_by": current_user.id,
            "status_changed_by_name": current_user.name or current_user.email,
            "status_changed_at": datetime.utcnow()
        }}
    )
    
    # Emit job status change for real-time updates
    await emit_job_status({
        "job_id": job_id,
        "title": job.get("title", ""),
        "is_active": new_status,
        "action": "activated" if new_status else "deactivated",
        "changed_by": current_user.name or current_user.email
    })
    
    return {"message": f"Job {'activated' if new_status else 'deactivated'} successfully", "is_active": new_status}


@router.put("/{job_id}/assign-team-lead")
async def assign_team_lead_to_job(
    job_id: str,
    team_lead_id: str = Body(..., embed=True),
    current_user: UserInDB = Depends(check_permission("can_assign_jobs")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Assign a team lead to a job. Requires can_assign_jobs permission (Admin only by default)."""
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify team lead exists and has correct role
    if team_lead_id:
        team_lead = await db.users.find_one({"_id": ObjectId(team_lead_id)})
        if not team_lead:
            raise HTTPException(status_code=404, detail="Team lead not found")
        if team_lead.get("role") != UserRole.TEAM_LEAD.value:
            raise HTTPException(status_code=400, detail="User is not a team lead")
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"assigned_team_lead_id": team_lead_id}}
    )
    
    # Notify the Team Lead they've been assigned to a job
    if team_lead_id:
        await _create_notification(
            db,
            team_lead_id,
            NotificationType.JOB_ASSIGNED,
            "Assigned to Job",
            f"You have been assigned to the job: {job['title']}",
            {
                "job_id": job_id,
                "job_title": job["title"],
                "assigned_by": current_user.id,
                "assigned_by_name": current_user.name or current_user.email
            }
        )
    
    return {"message": "Team lead assigned successfully", "assigned_team_lead_id": team_lead_id}


@router.put("/{job_id}/assign-recruiters")
async def assign_recruiters_to_job(
    job_id: str,
    recruiter_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Assign recruiters to a job.
    - Admin: can assign any recruiter
    - Team Lead with can_self_assign_recruiters: can assign recruiters to jobs they are assigned to
    """
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Permission check
    is_admin = current_user.role == UserRole.ADMIN
    is_assigned_team_lead = current_user.role == UserRole.TEAM_LEAD and job.get("assigned_team_lead_id") == current_user.id
    has_self_assign = current_user.has_permission("can_self_assign_recruiters")
    
    if not is_admin and not (is_assigned_team_lead and has_self_assign):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to assign recruiters to this job"
        )
    
    # Verify all recruiters exist and have correct role
    for recruiter_id in recruiter_ids:
        recruiter = await db.users.find_one({"_id": ObjectId(recruiter_id)})
        if not recruiter:
            raise HTTPException(status_code=404, detail=f"Recruiter not found: {recruiter_id}")
        if recruiter.get("role") != UserRole.RECRUITER.value:
            raise HTTPException(status_code=400, detail=f"User {recruiter_id} is not a recruiter")
    
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"assigned_recruiter_ids": recruiter_ids}}
    )
    
    # Notify each recruiter they've been assigned to a job
    for recruiter_id in recruiter_ids:
        await _create_notification(
            db,
            recruiter_id,
            NotificationType.JOB_ASSIGNED,
            "Assigned to Job",
            f"You have been assigned to the job: {job['title']}",
            {
                "job_id": job_id,
                "job_title": job["title"],
                "assigned_by": current_user.id,
                "assigned_by_name": current_user.name or current_user.email
            }
        )
    
    return {"message": "Recruiters assigned successfully", "assigned_recruiter_ids": recruiter_ids}

