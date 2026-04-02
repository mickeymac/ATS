from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import shutil
import uuid
from typing import List
from app.core.deps import get_db, get_current_active_user
from app.schemas.user import UserInDB
from app.schemas.chat import MessageResponse, ChatContact, GroupCreate, GroupResponse, GroupUpdate
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from typing import Optional, List

router = APIRouter()

@router.get("/contacts", response_model=List[ChatContact])
async def get_contacts(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Fetch all users except the current one
    current_uid = ObjectId(current_user.id) if ObjectId.is_valid(current_user.id) else current_user.id
    users_cursor = db.users.find({"_id": {"$ne": current_uid}})
    
    contacts = []
    async for user in users_cursor:
        user_id_str = str(user["_id"])
        
        # Get unread count
        unread_count = await db.messages.count_documents({
            "sender_id": user_id_str,
            "receiver_id": current_user.id,
            "is_read": False
        })
        
        # Get last message
        last_message_doc = await db.messages.find({
            "$and": [
                {
                    "$or": [
                        {"sender_id": current_user.id, "receiver_id": user_id_str},
                        {"sender_id": user_id_str, "receiver_id": current_user.id}
                    ]
                },
                {"deleted_for": {"$ne": current_user.id}}
            ]
        }).sort("timestamp", -1).limit(1).to_list(1)
        
        last_message = None
        last_message_time = None
        if last_message_doc:
            last_message = last_message_doc[0]["message_text"]
            last_message_time = last_message_doc[0]["timestamp"]
            
        contacts.append(ChatContact(
            id=user_id_str,
            name=user.get("name", ""),
            email=user.get("email", ""),
            profile_image=user.get("profile_image"),
            is_online=user.get("is_online", False),
            last_seen=user.get("last_seen"),
            unread_count=unread_count,
            last_message=last_message,
            last_message_time=last_message_time
        ))
        
    # Fetch all groups user is part of
    groups_cursor = db.groups.find({"members": current_user.id})
    async for group in groups_cursor:
        group_id_str = str(group["_id"])
        
        # Get unread count for group
        unread_count = await db.messages.count_documents({
            "group_id": group_id_str,
            "receiver_id": current_user.id, # We'll need to update how group marks are read
            "is_read": False
        })
        
        # Get last message in group
        last_message_doc = await db.messages.find({
            "$and": [
                {"group_id": group_id_str},
                {"deleted_for": {"$ne": current_user.id}}
            ]
        }).sort("timestamp", -1).limit(1).to_list(1)
        
        last_message = None
        last_message_time = None
        if last_message_doc:
            last_message = last_message_doc[0].get("message_text") or f"Sent a {last_message_doc[0].get('file_type')}"
            last_message_time = last_message_doc[0]["timestamp"]
            
        contacts.append(ChatContact(
            id=group_id_str,
            name=group.get("name", "Unnamed Group"),
            email="",
            profile_image=group.get("profile_image"),
            is_online=True, # Groups are always "online"
            unread_count=unread_count,
            last_message=last_message,
            last_message_time=last_message_time,
            type="group",
            admins=group.get("admins", [group.get("created_by")])
        ))

    # Sort contacts: those with messages first, then by last message time
    contacts.sort(key=lambda x: x.last_message_time.timestamp() if x.last_message_time else 0, reverse=True)
    return contacts

@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group_data: GroupCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Ensure current user is in members and is an admin
    if current_user.id not in group_data.members:
        group_data.members.append(current_user.id)
    
    if current_user.id not in group_data.admins:
        group_data.admins.append(current_user.id)
        
    new_group = {
        "name": group_data.name,
        "description": group_data.description,
        "members": group_data.members,
        "admins": group_data.admins,
        "profile_image": group_data.profile_image,
        "created_by": current_user.id,
        "created_at": datetime.utcnow()
    }
    
    result = await db.groups.insert_one(new_group)
    new_group["_id"] = str(result.inserted_id)
    return GroupResponse(**new_group)

@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: str,
    group_update: GroupUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if current_user.id not in group.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can update group settings")
        
    update_data = group_update.dict(exclude_unset=True)
    if update_data:
        await db.groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
        
    updated_group = await db.groups.find_one({"_id": ObjectId(group_id)})
    updated_group["_id"] = str(updated_group["_id"])
    return GroupResponse(**updated_group)

@router.post("/groups/{group_id}/members")
async def add_group_members(
    group_id: str,
    user_ids: List[str],
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if current_user.id not in group.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can add members")
        
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$addToSet": {"members": {"$each": user_ids}}}
    )
    return {"status": "success", "added": user_ids}

@router.delete("/groups/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: str,
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Allow admins to remove anyone, or users to leave themselves
    if current_user.id not in group.get("admins", []) and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")
        
    # Prevent removing the last admin unless leaving the group
    if user_id in group.get("admins", []) and len(group.get("admins", [])) <= 1 and current_user.id == user_id:
        # If last admin leaves, maybe assign another admin or just allow it?
        # For now, just allow it or maybe pick the next member as admin
        pass

    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$pull": {"members": user_id, "admins": user_id}}
    )
    return {"status": "success", "removed": user_id}

@router.get("/groups/{group_id}/members")
async def get_group_members(
    group_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(group_id):
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if current_user.id not in group.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    member_ids = [ObjectId(uid) for uid in group.get("members", []) if ObjectId.is_valid(uid)]
    users_cursor = db.users.find({"_id": {"$in": member_ids}})
    
    members = []
    async for user in users_cursor:
        uid_str = str(user["_id"])
        members.append({
            "id": uid_str,
            "name": user.get("name"),
            "email": user.get("email"),
            "profile_image": user.get("profile_image"),
            "is_online": user.get("is_online", False),
            "is_admin": uid_str in group.get("admins", [])
        })
        
    return members

@router.get("/history/{contact_id}", response_model=List[MessageResponse])
async def get_chat_history(
    contact_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Check if contact_id is a group or user
    query = {
        "$and": [
            {"deleted_for": {"$ne": current_user.id}}
        ]
    }
    
    # Try to find if it's a group first
    is_group = await db.groups.find_one({"_id": ObjectId(contact_id) if ObjectId.is_valid(contact_id) else None})
    
    if is_group:
        query["$and"].append({"group_id": contact_id})
    else:
        query["$and"].append({
            "$or": [
                {"sender_id": current_user.id, "receiver_id": contact_id},
                {"sender_id": contact_id, "receiver_id": current_user.id}
            ]
        })
        
    cursor = db.messages.find(query).sort("timestamp", 1).skip(skip).limit(limit)
    
    messages = []
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        if msg.get("is_deleted_for_everyone"):
            msg["message_text"] = "This message was deleted"
            msg["file_url"] = None
        messages.append(MessageResponse(**msg))
        
    return messages

@router.post("/mark-read/{contact_id}")
async def mark_messages_read(
    contact_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.messages.update_many(
        {"sender_id": contact_id, "receiver_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"status": "success", "modified_count": result.modified_count}

@router.post("/upload")
async def upload_chat_attachment(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user)
):
    # Validation
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv", ".webm", ".ogg", ".mp3", ".wav", ".m4a"}
    filename, file_ext = os.path.splitext(file.filename)
    if file_ext.lower() not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")
        
    # Check if image, audio, or document
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    audio_exts = {".webm", ".ogg", ".mp3", ".wav", ".m4a"}
    
    if file_ext.lower() in image_exts:
        file_type = "image"
    elif file_ext.lower() in audio_exts:
        file_type = "audio"
    else:
        file_type = "document"
    
    # Save file path relation
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "chat_attachments")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    secure_name = f"{uuid.uuid4()}{file_ext.lower()}"
    file_path = os.path.join(UPLOAD_DIR, secure_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "file_url": f"/uploads/chat_attachments/{secure_name}",
        "file_type": file_type,
        "file_name": file.filename
    }

@router.get("/unread-count")
async def get_unread_count(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    count = await db.messages.count_documents({
        "receiver_id": current_user.id,
        "is_read": False
    })
    return {"count": count}

@router.delete("/message/{message_id}")
async def delete_message(
    message_id: str,
    mode: str = "me", # "me" or "everyone"
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID format")
        
    # Verify ownership or existence
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if mode == "everyone":
        if msg["sender_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this message for everyone")
        
        await db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {
                "message_text": None,
                "file_url": None,
                "file_type": None,
                "file_name": None,
                "is_deleted_for_everyone": True
            }}
        )
    else: # mode == "me"
        await db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$addToSet": {"deleted_for": current_user.id}}
        )
        
    return {"status": "success", "message_id": message_id}

@router.delete("/history/{contact_id}")
async def clear_chat_history(
    contact_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Asymmetric soft delete by appending user to deleted_for block
    result = await db.messages.update_many({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": contact_id},
            {"sender_id": contact_id, "receiver_id": current_user.id}
        ]
    }, {
        "$addToSet": {"deleted_for": current_user.id}
    })
    return {"status": "success", "modified_count": result.modified_count}
