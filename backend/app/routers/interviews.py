from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from datetime import datetime, timedelta
from app.core.config import settings
from app.db.mongodb import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.interview import InterviewSchedule, InterviewResponse, InterviewUpdate
from app.core.deps import get_current_active_user, check_role
from app.schemas.user import UserInDB, UserRole
from bson import ObjectId
from app.services.zoom_service import get_zoom_access_token
from app.services.email import send_interview_email, send_interview_updated_email, send_interview_cancelled_email

router = APIRouter()

@router.post("/schedule", response_model=InterviewResponse)
async def schedule_interview(
    payload: InterviewSchedule,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    start_dt = datetime.fromisoformat(payload.start_time.replace("Z", "+00:00")).replace(tzinfo=None)
    end_dt = start_dt + timedelta(minutes=payload.duration)
    date_str = start_dt.strftime("%Y-%m-%d")

    # Check for overlapping meetings
    existing_interviews = await db.interviews.find({"date": date_str}).to_list(length=None)
    for inv in existing_interviews:
        inv_start = datetime.strptime(f"{inv['date']} {inv['time']}", "%Y-%m-%d %H:%M")
        inv_end = inv_start + timedelta(minutes=inv.get("duration", 30))
        if max(start_dt, inv_start) < min(end_dt, inv_end):
            raise HTTPException(status_code=400, detail="Time slot overlaps with an existing meeting.")

    token = await get_zoom_access_token()

    url = "https://api.zoom.us/v2/users/me/meetings"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    data = {
        "topic": f"Interview with {payload.candidate_name}",
        "type": 2,  # Scheduled meeting
        "start_time": payload.start_time,
        "duration": payload.duration,
        "timezone": "Asia/Kolkata",
        "agenda": "Interview Round",
        "settings": {
            "waiting_room": True,
            "join_before_host": False,
            "host_video": True,
            "participant_video": True
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)

    if response.status_code == 201:
        meeting_data = response.json()
        zoom_link = meeting_data.get("join_url")

        interview_record = {
            "candidate": payload.candidate_name,
            "email": payload.candidate_email,
            "link": zoom_link,
            "zoom_meeting_id": str(meeting_data.get("id")) if meeting_data.get("id") else None,
            "date": datetime.fromisoformat(payload.start_time.replace("Z", "+00:00")).strftime("%Y-%m-%d"),
            "time": datetime.fromisoformat(payload.start_time.replace("Z", "+00:00")).strftime("%H:%M"),
            "duration": payload.duration,
            "application_id": ObjectId(payload.application_id) if payload.application_id else None,
            "created_by": current_user.get("_id", current_user.get("id")) if isinstance(current_user, dict) else getattr(current_user, "id", getattr(current_user, "_id", None)),
            "created_at": datetime.utcnow()
        }

        await db.interviews.insert_one(interview_record)
        
        # Format the id to string just in case
        interview_record["_id"] = str(interview_record["_id"])
        if interview_record["created_by"]:
            interview_record["created_by"] = str(interview_record["created_by"])
        if interview_record["application_id"]:
            interview_record["application_id"] = str(interview_record["application_id"])
            # Auto-update status inside applications collection if connected
            await db.applications.update_one(
                {"_id": ObjectId(payload.application_id)},
                {"$set": {"status": "Interview Scheduled"}}
            )

        # Notify Candidate via Native Email SMTP
        try:
            await send_interview_email(
                email=payload.candidate_email,
                candidate_name=payload.candidate_name,
                meeting_link=zoom_link,
                date=interview_record["date"],
                time=interview_record["time"]
            )
        except Exception as e:
            print("Failed sending candidate zoom email:", e)

        return {"success": True, "link": zoom_link, "interview": interview_record}
    else:
        error_detail = response.text
        print("Zoom Error Payload:", error_detail)
        return {"success": False, "error": f"Failed to create Zoom meeting: {error_detail}"}

@router.get("/")
async def get_interviews(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    try:
        interviews_cursor = db.interviews.find({}).sort("date", 1)
        interviews = await interviews_cursor.to_list(length=1000)
        
        user_ids = []
        for obj in interviews:
            cb = obj.get("created_by")
            if cb:
                if isinstance(cb, str) and ObjectId.is_valid(cb):
                    user_ids.append(ObjectId(cb))
                elif isinstance(cb, ObjectId):
                    user_ids.append(cb)
        
        user_ids = list(set(user_ids))
        users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=None)
        user_map = {str(u["_id"]): u.get("name", "Unknown") for u in users}

        for obj in interviews:
            obj["_id"] = str(obj["_id"])
            if obj.get("created_by"):
                cb_str = str(obj["created_by"])
                obj["created_by"] = cb_str
                obj["scheduled_by_name"] = user_map.get(cb_str, "Unknown")
            else:
                obj["scheduled_by_name"] = "Unknown"
                
            if obj.get("application_id"):
                obj["application_id"] = str(obj["application_id"])
                
        return {"interviews": interviews}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{interview_id}")
async def update_interview(
    interview_id: str,
    payload: InterviewUpdate,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID")
        
    existing = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        return {"success": True, "message": "No fields to update"}
        
    if "date" in update_data or "time" in update_data or "duration" in update_data:
        new_date = update_data.get("date", existing.get("date"))
        new_time = update_data.get("time", existing.get("time"))
        new_duration = update_data.get("duration", existing.get("duration", 30))
        
        if new_date and new_time:
            start_dt = datetime.strptime(f"{new_date} {new_time}", "%Y-%m-%d %H:%M")
            end_dt = start_dt + timedelta(minutes=new_duration)
            
            # Check for overlaps excluding the current interview
            existing_interviews = await db.interviews.find({"date": new_date, "_id": {"$ne": ObjectId(interview_id)}}).to_list(length=None)
            for inv in existing_interviews:
                inv_start = datetime.strptime(f"{inv['date']} {inv['time']}", "%Y-%m-%d %H:%M")
                inv_end = inv_start + timedelta(minutes=inv.get("duration", 30))
                if max(start_dt, inv_start) < min(end_dt, inv_end):
                    raise HTTPException(status_code=400, detail="Updated time slot overlaps with an existing meeting.")
        
    zoom_meeting_id = existing.get("zoom_meeting_id")
    if zoom_meeting_id:
        zoom_payload = {}
        new_date = update_data.get("date", existing.get("date"))
        new_time = update_data.get("time", existing.get("time"))
        if new_date and new_time:
            zoom_payload["start_time"] = f"{new_date}T{new_time}:00"
            zoom_payload["timezone"] = "Asia/Kolkata"
        if "duration" in update_data:
            zoom_payload["duration"] = update_data["duration"]
            
        if zoom_payload:
            try:
                token = await get_zoom_access_token()
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                url = f"https://api.zoom.us/v2/meetings/{zoom_meeting_id}"
                async with httpx.AsyncClient() as client:
                    await client.patch(url, headers=headers, json=zoom_payload)
            except Exception as e:
                print("Failed to sync update to zoom:", e)
        
    if "date" in update_data or "time" in update_data:
        update_data["reminder_sent"] = False

    await db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": update_data}
    )
    
    try:
        new_date = update_data.get("date", existing.get("date"))
        new_time = update_data.get("time", existing.get("time"))
        await send_interview_updated_email(
            email=existing.get("email"),
            candidate_name=existing.get("candidate"),
            meeting_link=existing.get("link"),
            date=new_date,
            time=new_time
        )
    except Exception as e:
        print("Failed to send update email:", e)
        
    return {"success": True, "message": "Interview updated successfully"}

@router.delete("/{interview_id}")
async def delete_interview(
    interview_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.RECRUITER])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID")
        
    existing = await db.interviews.find_one({"_id": ObjectId(interview_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    zoom_meeting_id = existing.get("zoom_meeting_id")
    if zoom_meeting_id:
        try:
            token = await get_zoom_access_token()
            headers = {"Authorization": f"Bearer {token}"}
            url = f"https://api.zoom.us/v2/meetings/{zoom_meeting_id}"
            async with httpx.AsyncClient() as client:
                await client.delete(url, headers=headers)
        except Exception as e:
            print("Failed to sync delete to zoom:", e)
    
    result = await db.interviews.delete_one({"_id": ObjectId(interview_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    try:
        await send_interview_cancelled_email(
            email=existing.get("email"),
            candidate_name=existing.get("candidate")
        )
    except Exception as e:
        print("Failed to send cancellation email:", e)
        
    return {"success": True, "message": "Interview deleted successfully"}
