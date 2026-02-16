from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.team import TeamRole


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[dict] = None
    invite_enabled: Optional[bool] = None


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    username: str
    email: str
    full_name: Optional[str]
    role: TeamRole
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    invite_code: Optional[str]
    invite_enabled: bool
    created_at: datetime
    member_count: int = 0
    members: List[TeamMemberResponse] = []

    class Config:
        from_attributes = True


class TeamInvite(BaseModel):
    invite_code: str


class TeamMemberUpdate(BaseModel):
    role: TeamRole
