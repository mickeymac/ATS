"""
Socket.IO manager for real-time updates.
Provides centralized event emission for notifications, permissions, batches, etc.
"""

import socketio
from typing import Optional, Dict, Any, List

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
        print(f"[Socket.IO] User {user_id} joined room user:{user_id}", flush=True)
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
