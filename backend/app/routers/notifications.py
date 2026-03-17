from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.deps import get_current_active_user, get_db
from app.schemas.user import UserInDB
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

router = APIRouter()


@router.get("/")
async def get_notifications(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all unread notifications for current user."""
    cursor = db.notifications.find({
        "user_id": current_user.id,
        "read": False
    }).sort("created_at", -1)
    
    notifications = []
    async for notif in cursor:
        notif["_id"] = str(notif["_id"])
        notifications.append(notif)
    
    return notifications


@router.get("/count")
async def get_notification_count(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get count of unread notifications."""
    count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "read": False
    })
    return {"count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark a notification as read (deletes it like WhatsApp/Instagram)."""
    result = await db.notifications.delete_one({
        "_id": ObjectId(notification_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"success": True}


@router.post("/read-all")
async def mark_all_read(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark all notifications as read (deletes them)."""
    result = await db.notifications.delete_many({
        "user_id": current_user.id,
        "read": False
    })
    
    return {"success": True, "deleted": result.deleted_count}
