from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import secrets
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.team import Team, TeamMember, TeamRole
from app.schemas.team import (
    TeamCreate, TeamUpdate, TeamResponse, TeamMemberResponse,
    TeamInvite, TeamMemberUpdate
)

router = APIRouter()


def team_to_response(team: Team) -> TeamResponse:
    """Convert Team model to response with member info."""
    members = [
        TeamMemberResponse(
            id=m.id,
            user_id=m.user_id,
            username=m.user.username,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role,
            joined_at=m.joined_at
        )
        for m in team.members
    ]
    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        avatar_url=team.avatar_url,
        invite_code=team.invite_code,
        invite_enabled=team.invite_enabled,
        created_at=team.created_at,
        member_count=len(members),
        members=members
    )


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all teams the user is a member of."""
    result = await db.execute(
        select(Team)
        .join(TeamMember)
        .where(TeamMember.user_id == current_user.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    teams = result.scalars().all()
    return [team_to_response(team) for team in teams]


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new team."""
    team = Team(
        name=team_data.name,
        description=team_data.description,
        invite_code=secrets.token_urlsafe(8)
    )
    db.add(team)
    await db.flush()

    # Add creator as owner
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.OWNER
    )
    db.add(member)
    await db.commit()

    # Reload with members
    result = await db.execute(
        select(Team)
        .where(Team.id == team.id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one()
    return team_to_response(team)


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get team details."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user is a member
    is_member = any(m.user_id == current_user.id for m in team.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a team member")

    return team_to_response(team)


@router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update team (admin/owner only)."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user is admin/owner
    member = next((m for m in team.members if m.user_id == current_user.id), None)
    if not member or member.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    update_data = team_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    await db.commit()
    await db.refresh(team)

    return team_to_response(team)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete team (owner only)."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members))
    )
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    member = next((m for m in team.members if m.user_id == current_user.id), None)
    if not member or member.role != TeamRole.OWNER:
        raise HTTPException(status_code=403, detail="Owner access required")

    await db.delete(team)
    await db.commit()


@router.post("/{team_id}/join", response_model=TeamResponse)
async def join_team(
    team_id: str,
    invite: TeamInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a team using invite code."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if not team.invite_enabled:
        raise HTTPException(status_code=403, detail="Invites are disabled for this team")

    if team.invite_code != invite.invite_code:
        raise HTTPException(status_code=400, detail="Invalid invite code")

    # Check if already a member
    is_member = any(m.user_id == current_user.id for m in team.members)
    if is_member:
        raise HTTPException(status_code=400, detail="Already a member")

    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.MEMBER
    )
    db.add(member)
    await db.commit()

    # Reload
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
    )
    team = result.scalar_one()
    return team_to_response(team)


@router.post("/{team_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Leave a team."""
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this team")

    if member.role == TeamRole.OWNER:
        raise HTTPException(status_code=400, detail="Owner cannot leave. Transfer ownership first.")

    await db.delete(member)
    await db.commit()


@router.patch("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_member_role(
    team_id: str,
    user_id: str,
    member_update: TeamMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a member's role (admin/owner only)."""
    # Get current user's membership
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    current_member = result.scalar_one_or_none()

    if not current_member or current_member.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get target member
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        .options(selectinload(TeamMember.user))
    )
    target_member = result.scalar_one_or_none()

    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Only owner can change admin roles or transfer ownership
    if member_update.role == TeamRole.OWNER or target_member.role == TeamRole.OWNER:
        if current_member.role != TeamRole.OWNER:
            raise HTTPException(status_code=403, detail="Only owner can transfer ownership")

    target_member.role = member_update.role
    await db.commit()
    await db.refresh(target_member)

    return TeamMemberResponse(
        id=target_member.id,
        user_id=target_member.user_id,
        username=target_member.user.username,
        email=target_member.user.email,
        full_name=target_member.user.full_name,
        role=target_member.role,
        joined_at=target_member.joined_at
    )


@router.delete("/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    team_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a member from team (admin/owner only)."""
    # Get current user's membership
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == current_user.id)
    )
    current_member = result.scalar_one_or_none()

    if not current_member or current_member.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get target member
    result = await db.execute(
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    target_member = result.scalar_one_or_none()

    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    if target_member.role == TeamRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove owner")

    await db.delete(target_member)
    await db.commit()
