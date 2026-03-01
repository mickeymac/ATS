from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from app.core.deps import get_current_active_user, check_role, get_db
from app.schemas.user import UserInDB, UserRole
from app.schemas.notification import NotificationType
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
import uuid

router = APIRouter()

# Default Team Lead ID (Kaushal)
DEFAULT_TEAM_LEAD_ID = "69a1ec80811ca2c0ff289093"


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


@router.post("/send-for-review")
async def send_for_review(
    application_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.RECRUITER, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Recruiter sends selected applications to Team Lead for review."""
    print(f"Received application_ids for review: {application_ids}")
    
    if not application_ids:
        raise HTTPException(status_code=400, detail="No applications selected")
    
    # Create a review batch
    batch_id = str(uuid.uuid4())
    batch_doc = {
        "batch_id": batch_id,
        "recruiter_id": current_user.id,
        "recruiter_name": current_user.name or current_user.email,
        "team_lead_id": DEFAULT_TEAM_LEAD_ID,
        "application_ids": application_ids,
        "candidate_count": len(application_ids),
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    print(f"Creating batch: {batch_doc}")
    await db.review_batches.insert_one(batch_doc)
    
    # Update all applications with review status
    for app_id in application_ids:
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "review_status": "sent_for_review",
                    "review_batch_id": batch_id,
                    "sent_for_review_at": datetime.utcnow()
                }
            }
        )
    
    # Create notification for Team Lead
    await _create_notification(
        db,
        DEFAULT_TEAM_LEAD_ID,
        NotificationType.REVIEW_REQUEST,
        "New Review Request",
        f"{current_user.name or current_user.email} sent {len(application_ids)} candidate(s) for review",
        {
            "batch_id": batch_id,
            "recruiter_id": current_user.id,
            "recruiter_name": current_user.name or current_user.email,
            "candidate_count": len(application_ids)
        }
    )
    
    return {
        "success": True,
        "batch_id": batch_id,
        "message": f"Sent {len(application_ids)} candidate(s) for review"
    }


@router.post("/reject-directly")
async def reject_directly(
    application_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.RECRUITER, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Recruiter directly marks candidates as not selected (bypasses Team Lead review)."""
    if not application_ids:
        raise HTTPException(status_code=400, detail="No applications selected")
    
    # Update all applications to not_selected status
    for app_id in application_ids:
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "review_status": "not_selected",
                    "reviewed_at": datetime.utcnow(),
                    "rejected_by_recruiter": True
                }
            }
        )
    
    return {
        "success": True,
        "message": f"Marked {len(application_ids)} candidate(s) as not selected"
    }


@router.get("/batches")
async def get_review_batches(
    current_user: UserInDB = Depends(check_role([UserRole.TEAM_LEAD, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all review batches for Team Lead."""
    cursor = db.review_batches.find({"team_lead_id": DEFAULT_TEAM_LEAD_ID})
    batches = []
    async for batch in cursor:
        batch["_id"] = str(batch["_id"])
        # Serialize dates
        if batch.get("created_at"):
            batch["created_at"] = batch["created_at"].isoformat() if hasattr(batch["created_at"], 'isoformat') else str(batch["created_at"])
        print(f"Batch found: {batch.get('batch_id')}, recruiter: {batch.get('recruiter_name')}, app_ids: {batch.get('application_ids')}")
        batches.append(batch)
    print(f"Total batches found: {len(batches)}")
    return batches


@router.get("/batch/{batch_id}/applications")
async def get_batch_applications(
    batch_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.TEAM_LEAD, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all applications in a review batch."""
    batch = await db.review_batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Serialize batch _id and dates
    batch["_id"] = str(batch["_id"])
    if batch.get("created_at"):
        batch["created_at"] = batch["created_at"].isoformat() if hasattr(batch["created_at"], 'isoformat') else str(batch["created_at"])
    if batch.get("completed_at"):
        batch["completed_at"] = batch["completed_at"].isoformat() if hasattr(batch["completed_at"], 'isoformat') else str(batch["completed_at"])
    
    applications = []
    for app_id in batch.get("application_ids", []):
        try:
            if not ObjectId.is_valid(app_id):
                print(f"Invalid ObjectId: {app_id}")
                continue
            app = await db.applications.find_one({"_id": ObjectId(app_id)})
            if app:
                # Serialize all ObjectId and datetime fields
                app["_id"] = str(app["_id"])
                if app.get("job_id"):
                    app["job_id"] = str(app["job_id"])
                # Convert datetime fields to ISO strings
                for date_field in ["applied_at", "sent_for_review_at", "reviewed_at", "created_at", "updated_at"]:
                    if app.get(date_field):
                        app[date_field] = app[date_field].isoformat() if hasattr(app[date_field], 'isoformat') else str(app[date_field])
                # Get job title
                job_id = app.get("job_id")
                if job_id and ObjectId.is_valid(job_id):
                    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
                    if job:
                        app["job_title"] = job.get("title")
                applications.append(app)
            else:
                print(f"Application not found: {app_id}")
        except Exception as e:
            print(f"Error fetching application {app_id}: {e}")
    
    print(f"Batch {batch_id}: Found {len(applications)} applications out of {len(batch.get('application_ids', []))} IDs")
    
    return {
        "batch": batch,
        "applications": applications
    }


@router.post("/complete")
async def complete_review(
    batch_id: str = Body(...),
    approved_ids: List[str] = Body(...),
    current_user: UserInDB = Depends(check_role([UserRole.TEAM_LEAD, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Team Lead completes review: marks selected as approved, others as not_selected."""
    batch = await db.review_batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    all_ids = batch.get("application_ids", [])
    not_selected_ids = [aid for aid in all_ids if aid not in approved_ids]
    
    # Update approved applications
    for app_id in approved_ids:
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "review_status": "approved",
                    "reviewed_at": datetime.utcnow(),
                    "reviewed_by": current_user.id
                }
            }
        )
    
    # Update not selected applications
    for app_id in not_selected_ids:
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "review_status": "not_selected",
                    "reviewed_at": datetime.utcnow(),
                    "reviewed_by": current_user.id
                }
            }
        )
    
    # Mark batch as completed
    await db.review_batches.update_one(
        {"batch_id": batch_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "approved_count": len(approved_ids),
                "not_selected_count": len(not_selected_ids)
            }
        }
    )
    
    # Notify recruiter
    recruiter_id = batch.get("recruiter_id")
    if recruiter_id:
        if len(approved_ids) == 0:
            # Special notification when no candidates are selected
            await _create_notification(
                db,
                recruiter_id,
                NotificationType.REVIEW_COMPLETED,
                "No Candidates Selected",
                f"Team Lead has reviewed your candidates. Unfortunately, no candidates were selected for approval.",
                {
                    "batch_id": batch_id,
                    "approved_count": 0,
                    "not_selected_count": len(not_selected_ids),
                    "no_selection": True
                }
            )
        else:
            await _create_notification(
                db,
                recruiter_id,
                NotificationType.REVIEW_COMPLETED,
                "Review Completed",
                f"Team Lead has reviewed your candidates. {len(approved_ids)} approved, {len(not_selected_ids)} not selected.",
                {
                    "batch_id": batch_id,
                    "approved_count": len(approved_ids),
                    "not_selected_count": len(not_selected_ids)
                }
            )
    
    return {
        "success": True,
        "approved": len(approved_ids),
        "not_selected": len(not_selected_ids)
    }


@router.post("/resubmit")
async def resubmit_for_review(
    application_ids: List[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.RECRUITER, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Recruiter re-submits previously not selected candidates for review."""
    if not application_ids:
        raise HTTPException(status_code=400, detail="No applications selected")
    
    # Verify all applications belong to this recruiter and are "not_selected"
    for app_id in application_ids:
        app = await db.applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            raise HTTPException(status_code=404, detail=f"Application {app_id} not found")
        if app.get("uploaded_by") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to resubmit this application")
        if app.get("review_status") != "not_selected":
            raise HTTPException(status_code=400, detail=f"Application {app_id} is not in 'not_selected' status")
    
    # Create a new review batch
    batch_id = str(uuid.uuid4())
    batch_doc = {
        "batch_id": batch_id,
        "recruiter_id": current_user.id,
        "recruiter_name": current_user.name or current_user.email,
        "team_lead_id": DEFAULT_TEAM_LEAD_ID,
        "application_ids": application_ids,
        "candidate_count": len(application_ids),
        "status": "pending",
        "is_resubmission": True,
        "created_at": datetime.utcnow()
    }
    await db.review_batches.insert_one(batch_doc)
    
    # Update applications
    for app_id in application_ids:
        await db.applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "review_status": "sent_for_review",
                    "review_batch_id": batch_id,
                    "sent_for_review_at": datetime.utcnow(),
                    "reviewed_at": None,
                    "reviewed_by": None
                }
            }
        )
    
    # Notify Team Lead
    await _create_notification(
        db,
        DEFAULT_TEAM_LEAD_ID,
        NotificationType.REVIEW_REQUEST,
        "Resubmission Request",
        f"{current_user.name or current_user.email} re-submitted {len(application_ids)} candidate(s) for review",
        {
            "batch_id": batch_id,
            "recruiter_id": current_user.id,
            "recruiter_name": current_user.name or current_user.email,
            "candidate_count": len(application_ids),
            "is_resubmission": True
        }
    )
    
    return {
        "success": True,
        "batch_id": batch_id,
        "message": f"Re-submitted {len(application_ids)} candidate(s) for review"
    }


@router.post("/applications/{application_id}/comment")
async def add_comment(
    application_id: str,
    text: str = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.RECRUITER, UserRole.TEAM_LEAD, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add a comment to an application."""
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    comment = {
        "user_id": current_user.id,
        "user_name": current_user.name or current_user.email,
        "user_role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "text": text,
        "created_at": datetime.utcnow()
    }
    
    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$push": {"comments": comment}}
    )
    
    return {"success": True, "comment": comment}


@router.get("/applications/{application_id}/comments")
async def get_comments(
    application_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.RECRUITER, UserRole.TEAM_LEAD, UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all comments for an application."""
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"comments": app.get("comments", [])}
