from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from app.core.deps import get_current_active_user, get_db
from app.schemas.user import UserInDB

router = APIRouter()

@router.get("/")
async def global_search(
    q: str = Query(..., min_length=1),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Search across jobs and applications.
    """
    results = {
        "jobs": [],
        "candidates": []
    }

    # Search Jobs
    jobs_cursor = db.jobs.find({
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    }).limit(5)
    
    async for job in jobs_cursor:
        results["jobs"].append({
            "id": str(job["_id"]),
            "title": job["title"],
            "location": job.get("location", "Remote"),
            "type": job.get("type", "Full-time")
        })

    # Search Candidates (Applications)
    # Search by name or email
    apps_cursor = db.applications.find({
        "$or": [
            {"candidate_name_extracted": {"$regex": q, "$options": "i"}},
            {"candidate_email": {"$regex": q, "$options": "i"}},
            {"job_title": {"$regex": q, "$options": "i"}}
        ]
    }).limit(5)

    async for app in apps_cursor:
        results["candidates"].append({
            "id": str(app["_id"]),
            "name": app.get("candidate_name_extracted", "Unknown"),
            "email": app.get("candidate_email", "N/A"),
            "job_title": app.get("job_title", "N/A"),
            "status": app.get("status", "Applied")
        })

    return results
