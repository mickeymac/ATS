from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Dict
from app.core.deps import check_role, check_permission, get_db, get_current_active_user
from app.schemas.user import UserInDB, UserCreate, UserRole, UserUpdate, DEFAULT_PERMISSIONS
from app.core.security import get_password_hash
from app.services.socket_manager import emit_permission_updated
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.get("/", response_model=List[UserInDB])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cursor = db.users.find().skip(skip).limit(limit)
    users = []
    async for user in cursor:
        user["_id"] = str(user["_id"])
        users.append(UserInDB(**user))
    return users

@router.post("/", response_model=UserInDB)
async def create_user(
    user_in: UserCreate,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )
    
    user_doc = user_in.dict()
    user_doc["password_hash"] = get_password_hash(user_in.password)
    del user_doc["password"]
    user_doc["created_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)
    return UserInDB(**user_doc)

@router.get("/me")
async def read_current_user(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get current user with effective permissions."""
    # Calculate effective permissions for the user
    role_defaults = DEFAULT_PERMISSIONS.get(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role, {})
    custom_permissions = current_user.permissions or {}
    effective_permissions = {**role_defaults, **custom_permissions}
    
    # Return user data with effective permissions
    user_dict = {
        "_id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role,
        "phone": current_user.phone,
        "department": current_user.department,
        "bio": current_user.bio,
        "profile_image": current_user.profile_image,
        "team_lead": current_user.team_lead,
        "team_lead_id": current_user.team_lead_id,
        "permissions": effective_permissions,
        "created_at": current_user.created_at
    }
    return user_dict

@router.put("/me", response_model=UserInDB)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.id == "admin-static":
        raise HTTPException(status_code=400, detail="Admin profile cannot be updated")

    update_doc = {}
    if user_update.name is not None:
        update_doc["name"] = user_update.name
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing = await db.users.find_one({"email": user_update.email, "_id": {"$ne": ObjectId(current_user.id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_doc["email"] = user_update.email
    if user_update.phone is not None:
        update_doc["phone"] = user_update.phone
    if user_update.department is not None:
        update_doc["department"] = user_update.department
    if user_update.bio is not None:
        update_doc["bio"] = user_update.bio
    if user_update.profile_image is not None:
        update_doc["profile_image"] = user_update.profile_image
    if user_update.team_lead is not None:
        update_doc["team_lead"] = user_update.team_lead
    if user_update.password:
        update_doc["password_hash"] = get_password_hash(user_update.password)

    if not update_doc:
        return current_user

    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_doc}
    )

    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    return UserInDB(**updated_user)

@router.delete("/me")
async def delete_current_user(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if current_user.id == "admin-static":
        raise HTTPException(status_code=400, detail="Admin account cannot be deleted")

    await db.users.delete_one({"_id": ObjectId(current_user.id)})
    return {"message": "Account deleted successfully"}


# Static routes MUST come BEFORE /{user_id} routes
@router.get("/with-permissions", response_model=List[dict])
async def get_users_with_permissions(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all users with their effective permissions (for admin permissions page)."""
    cursor = db.users.find()
    users = []
    async for user in cursor:
        user_id = str(user["_id"])
        role = user.get("role", "recruiter")
        custom_permissions = user.get("permissions", {})
        
        # Calculate effective permissions
        role_defaults = DEFAULT_PERMISSIONS.get(role, {})
        effective_permissions = {**role_defaults, **custom_permissions}
        
        users.append({
            "id": user_id,
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": role,
            "team_lead_id": user.get("team_lead_id"),
            "permissions": effective_permissions,
            "custom_permissions": custom_permissions
        })
    
    return users


@router.get("/roles/team-leads")
async def get_team_leads(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all team leads for dropdown selection."""
    cursor = db.users.find({"role": UserRole.TEAM_LEAD.value})
    team_leads = []
    async for user in cursor:
        user["_id"] = str(user["_id"])
        team_leads.append({
            "id": user["_id"],
            "name": user.get("name", ""),
            "email": user.get("email", "")
        })
    return team_leads


@router.get("/roles/recruiters")
async def get_recruiters(
    team_lead_id: Optional[str] = None,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN, UserRole.TEAM_LEAD])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get recruiters. If team_lead_id is provided, returns only recruiters assigned to that team lead.
    Admin can see all recruiters, Team Lead can only see their own recruiters.
    """
    query = {"role": UserRole.RECRUITER.value}
    
    if current_user.role == UserRole.TEAM_LEAD:
        # Team Lead can only see their own recruiters
        query["team_lead_id"] = current_user.id
    elif team_lead_id:
        # Admin filtering by team lead
        query["team_lead_id"] = team_lead_id
    
    cursor = db.users.find(query)
    recruiters = []
    async for user in cursor:
        user["_id"] = str(user["_id"])
        recruiters.append({
            "id": user["_id"],
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "team_lead_id": user.get("team_lead_id")
        })
    return recruiters


@router.get("/permissions/defaults")
async def get_default_permissions(
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN]))
):
    """Get default permissions for each role."""
    return DEFAULT_PERMISSIONS


# Dynamic routes with {user_id} MUST come AFTER static routes
@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}


@router.get("/{user_id}", response_model=UserInDB)
async def get_user(
    user_id: str,
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific user by ID."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return UserInDB(**user)


@router.put("/{user_id}/permissions")
async def update_user_permissions(
    user_id: str,
    permissions: Dict[str, bool] = Body(...),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update a user's custom permissions.
    Only Admin can update permissions.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate permission keys
    valid_permissions = [
        "can_create_jobs", "can_delete_jobs", "can_activate_jobs",
        "can_assign_jobs", "can_self_assign_recruiters", "can_send_interview_invites",
        "can_export_data", "can_manage_users", "can_manage_permissions"
    ]
    
    for key in permissions.keys():
        if key not in valid_permissions:
            raise HTTPException(status_code=400, detail=f"Invalid permission key: {key}")
    
    # Get existing permissions and merge
    existing_permissions = user.get("permissions", {})
    existing_permissions.update(permissions)
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"permissions": existing_permissions}}
    )
    
    # Calculate effective permissions for the user
    role = user.get("role", "recruiter")
    role_defaults = DEFAULT_PERMISSIONS.get(role, {})
    effective_permissions = {**role_defaults, **existing_permissions}
    
    # Emit socket event for real-time permission update
    await emit_permission_updated(user_id, effective_permissions)
    
    return {"message": "Permissions updated successfully", "permissions": existing_permissions}


@router.put("/{user_id}/assign-team-lead")
async def assign_recruiter_to_team_lead(
    user_id: str,
    team_lead_id: Optional[str] = Body(..., embed=True),
    current_user: UserInDB = Depends(check_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Assign a recruiter to a specific team lead.
    Only Admin can assign recruiters to team leads.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") != UserRole.RECRUITER.value:
        raise HTTPException(status_code=400, detail="Only recruiters can be assigned to team leads")
    
    # Validate team lead if provided
    if team_lead_id:
        if not ObjectId.is_valid(team_lead_id):
            raise HTTPException(status_code=400, detail="Invalid team lead ID")
        
        team_lead = await db.users.find_one({"_id": ObjectId(team_lead_id)})
        if not team_lead:
            raise HTTPException(status_code=404, detail="Team lead not found")
        
        if team_lead.get("role") != UserRole.TEAM_LEAD.value:
            raise HTTPException(status_code=400, detail="Specified user is not a team lead")
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"team_lead_id": team_lead_id}}
    )
    
    return {"message": "Recruiter assigned to team lead successfully", "team_lead_id": team_lead_id}
