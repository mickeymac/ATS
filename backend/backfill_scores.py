import asyncio
import sys
import os
from datetime import datetime

# Adjust Python path to load backend modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.services.scoring_engine import evaluate_application_v2

async def backfill():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    print("Fetching active jobs...")
    active_jobs = await db.jobs.find({"is_active": {"$ne": False}}).to_list(length=200)
    print(f"Found {len(active_jobs)} active jobs.")
    
    print("Fetching applications without global_job_scores...")
    # Find applications where global_job_scores is missing or empty
    cursor = db.applications.find({
        "$or": [
            {"global_job_scores": {"$exists": False}},
            {"global_job_scores": None},
            {"global_job_scores": {"$size": 0}}
        ]
    })
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    async for app in cursor:
        app_id = app.get("_id")
        parsed_data = app.get("parsed_data", {})
        extracted_text = app.get("extracted_text", "")
        
        # In our DB schema, parsed_data might be missing but we can try to reconstruct it or evaluate_application_v2 might need it.
        # Wait, if parsed_data is not stored in app, but only extracted_text is, then evaluate_application_v2 will be limited to using extracted_text?
        # Let's check if evaluate_application_v2 requires parsed_data. Yes, it takes (parsed_data, extracted_text, job).
        # We can construct parsed_data from app's fields: candidate_name_extracted, education, experience, etc.
        if not parsed_data:
            parsed_data = {
                "name": app.get("candidate_name_extracted"),
                "email": app.get("candidate_email") or app.get("candidate_email_extracted"),
                "phone": app.get("candidate_phone_extracted"),
                "skills": app.get("skills_extracted", []),
                "experience": app.get("experience_extracted", []),
                "education": app.get("education_extracted", []),
            }
            
        print(f"Processing application {app_id} for candidate {parsed_data.get('name')}")
        global_job_scores = []
        
        for job in active_jobs:
            try:
                job_score = await evaluate_application_v2(
                    parsed_data,
                    extracted_text,
                    job
                )
                global_job_scores.append({
                    "job_id": str(job["_id"]),
                    "job_title": job.get("title"),
                    "final_score": job_score.get("final_score", 0.0),
                    "skill_score": job_score.get("skill_score", 0.0),
                    "experience_score": job_score.get("experience_score", 0.0),
                    "education_score": job_score.get("education_score", 0.0),
                    "matched_skills": job_score.get("matched_skills", []),
                    "status": "applied",
                    "applied_at": datetime.utcnow()
                })
            except Exception as e:
                print(f"  Error scoring against job {job.get('title')}: {e}")
                
        if global_job_scores:
            await db.applications.update_one(
                {"_id": app_id},
                {"$set": {"global_job_scores": global_job_scores}}
            )
            updated_count += 1
            print(f"  Updated successfully with {len(global_job_scores)} scores.")
        else:
            skipped_count += 1
            
    print(f"Done! Updated: {updated_count}, Skipped: {skipped_count}, Errors: {error_count}")

if __name__ == "__main__":
    asyncio.run(backfill())
