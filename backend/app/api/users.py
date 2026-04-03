import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import PasswordChange, UserResponse, UserUpdate

router = APIRouter()


def _parse_settings(user: User) -> Optional[dict]:
    """Parse the settings JSON string from the User model into a dict."""
    if not user.settings:
        return None
    if isinstance(user.settings, dict):
        return user.settings
    try:
        return json.loads(user.settings)
    except (json.JSONDecodeError, TypeError):
        return None


def _user_to_response(user: User) -> UserResponse:
    """Convert a User model to a UserResponse with parsed settings."""
    data = {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "settings": _parse_settings(user),
        "created_at": user.created_at,
    }
    return UserResponse(**data)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return _user_to_response(current_user)


# Fields allowed for user self-update
USER_UPDATE_ALLOWED_FIELDS = {"email", "username", "full_name", "avatar_url", "settings"}


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    update_data = user_data.model_dump(exclude_unset=True)

    # Only update allowed fields to prevent privilege escalation
    for field, value in update_data.items():
        if field in USER_UPDATE_ALLOWED_FIELDS:
            # Serialize settings dict to JSON string for the Text column
            if field == "settings" and isinstance(value, dict):
                value = json.dumps(value)
            setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return _user_to_response(current_user)


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user password."""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )

    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
