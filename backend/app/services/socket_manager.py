"""
Socket.IO manager for real-time updates.
Provides centralized event emission for notifications, permissions, batches, etc.
"""

import socketio
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db_instance

# Create Socket.IO server with async mode
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Allow all origins for WebSocket
    logger=False,
    engineio_logger=False
)

# Socket app will be created after FastAPI app is ready
socket_app = None


def create_socket_app(fastapi_app):
    """Wrap FastAPI app with Socket.IO ASGI app."""
    global socket_app
    socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path='socket.io')
    return socket_app

# Store user_id to sid mapping for targeted messages
user_sessions: Dict[str, str] = {}  # {user_id: sid}


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection."""
    import sys
    print(f"[Socket.IO] Client connected: {sid}, auth: {auth}", flush=True)
    sys.stdout.flush()
    
    # Get user_id from auth data if provided
    if auth and auth.get('user_id'):
        user_id = str(auth['user_id'])
        user_sessions[user_id] = sid
        # Join personal room for targeted notifications
        await sio.enter_room(sid, f"user:{user_id}")
        
        # Join rooms for all groups user is a member of
        db = db_instance.db
        if db is not None:
            groups_cursor = db.groups.find({"members": user_id})
            async for group in groups_cursor:
                await sio.enter_room(sid, f"group:{str(group['_id'])}")
        
        print(f"[Socket.IO] User {user_id} joined room user:{user_id} and group rooms", flush=True)
        
        # Ext: Update online status
        db = db_instance.db
        if db is not None:
            user_query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
            await db.users.update_one(user_query, {"$set": {"is_online": True}})
            await sio.emit('user:status', {"user_id": user_id, "is_online": True})
    else:
        print(f"[Socket.IO] No user_id in auth for {sid}", flush=True)


@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    print(f"[Socket.IO] Client disconnected: {sid}")
    # Remove from user_sessions
    for user_id, session_sid in list(user_sessions.items()):
        if session_sid == sid:
            del user_sessions[user_id]
            
            # Ext: Update online status to offline
            db = db_instance.db
            if db is not None:
                last_seen_time = datetime.utcnow()
                user_query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
                await db.users.update_one(user_query, {"$set": {"is_online": False, "last_seen": last_seen_time}})
                await sio.emit('user:status', {"user_id": user_id, "is_online": False, "last_seen": last_seen_time.isoformat()})
            break


@sio.event
async def join_room(sid, data):
    """Allow client to join a specific room."""
    room = data.get('room')
    if room:
        await sio.enter_room(sid, room)
        print(f"[Socket.IO] {sid} joined room: {room}")


@sio.event
async def leave_room(sid, data):
    """Allow client to leave a specific room."""
    room = data.get('room')
    if room:
        await sio.leave_room(sid, room)
        print(f"[Socket.IO] {sid} left room: {room}")


@sio.on('chat:send')
async def chat_send(sid, data):
    """
    Handle sending a message.
    data: {receiver_id, message_text}
    """
    db = db_instance.db
    if db is None:
        return
        
    sender_id = None
    for uid, sess_id in user_sessions.items():
        if sess_id == sid:
            sender_id = uid
            break
            
    if not sender_id:
        return
        
    receiver_id = data.get("receiver_id")
    group_id = data.get("group_id")
    message_text = data.get("message_text")
    file_url = data.get("file_url")
    file_type = data.get("file_type")
    file_name = data.get("file_name")
    
    if not receiver_id and not group_id:
        return
    if not message_text and not file_url:
        return
        
    # Save to db
    msg_doc = {
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "group_id": group_id,
        "message_text": message_text,
        "file_url": file_url,
        "file_type": file_type,
        "file_name": file_name,
        "timestamp": datetime.utcnow(),
        "is_read": False,
        "deleted_for": []
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = str(result.inserted_id)
    msg_doc["timestamp"] = msg_doc["timestamp"].isoformat()
    
    # Emit to receiver or group
    if group_id:
        await sio.emit('chat:receive', msg_doc, room=f"group:{group_id}")
    else:
        await sio.emit('chat:receive', msg_doc, room=f"user:{receiver_id}")
        # Acknowledge to sender only for private chats (group receives it via broadcast)
        await sio.emit('chat:sent', msg_doc, room=sid)

@sio.on('chat:typing')
async def chat_typing(sid, data):
    """
    Handle typing indicator.
    data: {receiver_id, is_typing}
    """
    sender_id = None
    for uid, sess_id in user_sessions.items():
        if sess_id == sid:
            sender_id = uid
            break
            
    if not sender_id:
        return
        
    receiver_id = data.get("receiver_id")
    is_typing = data.get("is_typing", False)
    
    if receiver_id:
        await sio.emit('chat:typing', {"sender_id": sender_id, "is_typing": is_typing}, room=f"user:{receiver_id}")

@sio.on('chat:delete')
async def chat_delete(sid, data):
    """
    Handle deleting a message.
    data: {receiver_id, group_id, message_id, mode}
    """
    db = db_instance.db
    if db is None:
        return
        
    sender_id = None
    for uid, sess_id in user_sessions.items():
        if sess_id == sid:
            sender_id = uid
            break
            
    if not sender_id:
        return
        
    message_id = data.get("message_id")
    receiver_id = data.get("receiver_id")
    group_id = data.get("group_id")
    mode = data.get("mode", "me") # "me" or "everyone"
    
    if not message_id or not ObjectId.is_valid(message_id):
        return
        
    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        return

    if mode == "everyone":
        if msg["sender_id"] != sender_id:
            return # Only sender can delete for everyone
            
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
        
        # Broadcast erasure to everyone
        target_room = f"group:{group_id}" if group_id else f"user:{receiver_id}"
        await sio.emit('chat:deleted', {"message_id": message_id, "mode": "everyone"}, room=target_room)
        # Also notify sender
        await sio.emit('chat:deleted', {"message_id": message_id, "mode": "everyone"}, room=sid)
        
    else: # mode == "me"
        await db.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$addToSet": {"deleted_for": sender_id}}
        )
        # Notify only the sender
        await sio.emit('chat:deleted', {"message_id": message_id, "mode": "me"}, room=sid)

@sio.on('chat:clear')
async def chat_clear(sid, data):
    """
    Handle clearing a chat history entirely.
    data: {receiver_id}
    """
    db = db_instance.db
    if db is None:
        return
        
    sender_id = None
    for uid, sess_id in user_sessions.items():
        if sess_id == sid:
            sender_id = uid
            break
            
    if not sender_id:
        return
        
    receiver_id = data.get("receiver_id")
    group_id = data.get("group_id")
    
    if not receiver_id and not group_id:
        return
        
    # Asymmetric soft wipe: Add requester to 'deleted_for' list
    query = {}
    if group_id:
        query = {"group_id": group_id}
    else:
        query = {
            "$or": [
                {"sender_id": sender_id, "receiver_id": receiver_id},
                {"sender_id": receiver_id, "receiver_id": sender_id}
            ]
        }

    await db.messages.update_many(query, {
        "$addToSet": {"deleted_for": sender_id}
    })
    
    # Notify the sender to clear their local UI
    await sio.emit('chat:cleared', {
        "contact_id": group_id or receiver_id,
        "group_id": group_id
    }, room=sid)
    
@sio.on('chat:group_update')
async def chat_group_update(sid, data):
    """
    Broadcast that a group has been updated (name, etc)
    data: {group_id}
    """
    group_id = data.get("group_id")
    if group_id:
        await sio.emit('chat:group_updated', {"group_id": group_id}, room=f"group:{group_id}")

@sio.on('chat:member_change')
async def chat_member_change(sid, data):
    """
    Broadcast that members were added/removed
    data: {group_id, user_id, action: 'added' | 'removed'}
    """
    group_id = data.get("group_id")
    user_id = data.get("user_id")
    action = data.get("action")
    if group_id:
        if action == 'removed' and user_id:
            # Notify the specific user they were removed
            await sio.emit('chat:membership_revoked', {"group_id": group_id}, room=f"user:{user_id}")
            
        await sio.emit('chat:group_updated', {"group_id": group_id}, room=f"group:{group_id}")


# =====================
# Emit Helper Functions
# =====================

async def emit_notification(user_id: str, notification_data: dict):
    """
    Emit a new notification to a specific user.
    
    Args:
        user_id: Target user's ID
        notification_data: {type, title, message, data, created_at}
    """
    await sio.emit(
        'notification:new',
        notification_data,
        room=f"user:{user_id}"
    )
    print(f"[Socket.IO] Emitted notification:new to user:{user_id}")


async def emit_notification_count(user_id: str, count: int):
    """
    Emit updated notification count to a specific user.
    
    Args:
        user_id: Target user's ID
        count: New notification count
    """
    await sio.emit(
        'notification:count',
        {'count': count},
        room=f"user:{user_id}"
    )


async def emit_batch_created(team_lead_ids: List[str], batch_data: dict):
    """
    Emit new review batch creation to team leads.
    
    Args:
        team_lead_ids: List of team lead user IDs
        batch_data: {batch_id, recruiter_name, candidate_count, job_titles, created_at}
    """
    for tl_id in team_lead_ids:
        await sio.emit(
            'batch:created',
            batch_data,
            room=f"user:{tl_id}"
        )
    print(f"[Socket.IO] Emitted batch:created to team leads: {team_lead_ids}")


async def emit_batch_completed(recruiter_id: str, batch_data: dict):
    """
    Emit batch completion to the recruiter who sent it.
    
    Args:
        recruiter_id: Recruiter's user ID
        batch_data: {batch_id, completed_by, approved_count, not_selected_count}
    """
    await sio.emit(
        'batch:completed',
        batch_data,
        room=f"user:{recruiter_id}"
    )
    print(f"[Socket.IO] Emitted batch:completed to user:{recruiter_id}")


async def emit_permission_updated(user_id: str, permissions: dict):
    """
    Emit permission update to a specific user.
    
    Args:
        user_id: Target user's ID
        permissions: Updated permissions object
    """
    await sio.emit(
        'permission:updated',
        {'permissions': permissions},
        room=f"user:{user_id}"
    )
    print(f"[Socket.IO] Emitted permission:updated to user:{user_id}")


async def emit_application_status(user_id: str, application_data: dict):
    """
    Emit application status change to relevant user.
    
    Args:
        user_id: Target user's ID
        application_data: {application_id, status, candidate_name}
    """
    await sio.emit(
        'application:status',
        application_data,
        room=f"user:{user_id}"
    )


async def emit_job_status(job_data: dict):
    """
    Emit job status change to all connected clients.
    
    Args:
        job_data: {job_id, title, status, action}
    """
    await sio.emit('job:status', job_data)
    print(f"[Socket.IO] Emitted job:status: {job_data.get('title')}")


async def emit_job_created(job_data: dict):
    """
    Emit new job creation to all connected clients.
    
    Args:
        job_data: {job_id, title, created_by}
    """
    await sio.emit('job:created', job_data)
    print(f"[Socket.IO] Emitted job:created: {job_data.get('title')}")
