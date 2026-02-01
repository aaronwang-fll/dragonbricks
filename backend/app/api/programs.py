from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
import secrets
from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.team import TeamMember
from app.models.program import Program, ProgramShare, SharePermission
from app.schemas.program import (
    ProgramCreate, ProgramUpdate, ProgramResponse, ProgramListResponse,
    ProgramShareCreate, ProgramShareResponse, ProgramForkRequest, ProgramOwnerResponse
)

router = APIRouter()

# Fields allowed for program update
PROGRAM_UPDATE_ALLOWED_FIELDS = {
    "name", "description", "team_id", "setup_section", "main_section",
    "routines", "defaults", "generated_code", "is_public"
}


def program_to_response(program: Program) -> ProgramResponse:
    """Convert Program model to response."""
    owner_response = None
    if program.owner:
        owner_response = ProgramOwnerResponse(
            id=program.owner.id,
            username=program.owner.username,
            full_name=program.owner.full_name
        )

    return ProgramResponse(
        id=program.id,
        name=program.name,
        description=program.description,
        owner_id=program.owner_id,
        owner=owner_response,
        team_id=program.team_id,
        setup_section=program.setup_section,
        main_section=program.main_section,
        routines=program.routines,
        defaults=program.defaults,
        generated_code=program.generated_code,
        is_public=program.is_public,
        share_code=program.share_code,
        version=program.version,
        created_at=program.created_at,
        updated_at=program.updated_at
    )


async def check_program_access(
    program: Program,
    user: Optional[User],
    db: AsyncSession,
    require_edit: bool = False
) -> bool:
    """Check if user has access to program."""
    # Public programs are viewable by anyone
    if program.is_public and not require_edit:
        return True

    if not user:
        return False

    # Owner has full access
    if program.owner_id == user.id:
        return True

    # Check team membership
    if program.team_id:
        result = await db.execute(
            select(TeamMember)
            .where(TeamMember.team_id == program.team_id, TeamMember.user_id == user.id)
        )
        team_member = result.scalar_one_or_none()
        if team_member:
            return True

    # Check direct sharing
    result = await db.execute(
        select(ProgramShare)
        .where(ProgramShare.program_id == program.id, ProgramShare.user_id == user.id)
    )
    share = result.scalar_one_or_none()
    if share:
        if require_edit:
            return share.permission == SharePermission.EDIT
        return True

    return False


@router.get("", response_model=List[ProgramListResponse])
async def list_programs(
    team_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's programs and shared programs."""
    query = select(Program).options(selectinload(Program.owner))

    if team_id:
        # Filter by team
        query = query.where(Program.team_id == team_id)
    else:
        # User's own programs + shared with them + team programs
        team_ids_query = select(TeamMember.team_id).where(TeamMember.user_id == current_user.id)
        shared_program_ids = select(ProgramShare.program_id).where(ProgramShare.user_id == current_user.id)

        query = query.where(
            or_(
                Program.owner_id == current_user.id,
                Program.team_id.in_(team_ids_query),
                Program.id.in_(shared_program_ids)
            )
        )

    result = await db.execute(query.order_by(Program.updated_at.desc()))
    programs = result.scalars().all()

    return [
        ProgramListResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            owner_id=p.owner_id,
            owner_username=p.owner.username if p.owner else None,
            team_id=p.team_id,
            is_public=p.is_public,
            version=p.version,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in programs
    ]


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program_data: ProgramCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new program."""
    # If team_id provided, verify user is a member
    if program_data.team_id:
        result = await db.execute(
            select(TeamMember)
            .where(
                TeamMember.team_id == program_data.team_id,
                TeamMember.user_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not a member of this team")

    program = Program(
        name=program_data.name,
        description=program_data.description,
        owner_id=current_user.id,
        team_id=program_data.team_id,
        setup_section=program_data.setup_section,
        main_section=program_data.main_section,
        routines=program_data.routines,
        defaults=program_data.defaults,
        share_code=secrets.token_urlsafe(8)
    )
    db.add(program)
    await db.commit()

    # Reload with owner
    result = await db.execute(
        select(Program)
        .where(Program.id == program.id)
        .options(selectinload(Program.owner))
    )
    program = result.scalar_one()

    return program_to_response(program)


@router.get("/shared/{share_code}", response_model=ProgramResponse)
async def get_program_by_share_code(
    share_code: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get a program by its share code."""
    result = await db.execute(
        select(Program)
        .where(Program.share_code == share_code)
        .options(selectinload(Program.owner))
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    return program_to_response(program)


@router.get("/{program_id}", response_model=ProgramResponse)
async def get_program(
    program_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get a program by ID."""
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.owner))
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if not await check_program_access(program, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    return program_to_response(program)


@router.patch("/{program_id}", response_model=ProgramResponse)
async def update_program(
    program_id: str,
    program_data: ProgramUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a program."""
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.owner))
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if not await check_program_access(program, current_user, db, require_edit=True):
        raise HTTPException(status_code=403, detail="Edit access required")

    update_data = program_data.model_dump(exclude_unset=True)
    # Only update allowed fields to prevent privilege escalation
    for field, value in update_data.items():
        if field in PROGRAM_UPDATE_ALLOWED_FIELDS:
            setattr(program, field, value)

    program.version += 1
    await db.commit()
    await db.refresh(program)

    return program_to_response(program)


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a program (owner only)."""
    result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete")

    await db.delete(program)
    await db.commit()


@router.post("/{program_id}/fork", response_model=ProgramResponse)
async def fork_program(
    program_id: str,
    fork_data: ProgramForkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fork (copy) a program."""
    result = await db.execute(
        select(Program)
        .where(Program.id == program_id)
        .options(selectinload(Program.owner))
    )
    original = result.scalar_one_or_none()

    if not original:
        raise HTTPException(status_code=404, detail="Program not found")

    if not await check_program_access(original, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    new_name = fork_data.name or f"Copy of {original.name}"
    forked = Program(
        name=new_name,
        description=original.description,
        owner_id=current_user.id,
        setup_section=original.setup_section,
        main_section=original.main_section,
        routines=original.routines,
        defaults=original.defaults,
        generated_code=original.generated_code,
        parent_id=original.id,
        share_code=secrets.token_urlsafe(8)
    )
    db.add(forked)
    await db.commit()

    # Reload with owner
    result = await db.execute(
        select(Program)
        .where(Program.id == forked.id)
        .options(selectinload(Program.owner))
    )
    forked = result.scalar_one()

    return program_to_response(forked)


# Sharing endpoints
@router.get("/{program_id}/shares", response_model=List[ProgramShareResponse])
async def list_program_shares(
    program_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all shares for a program (owner only)."""
    result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner access required")

    result = await db.execute(
        select(ProgramShare)
        .where(ProgramShare.program_id == program_id)
        .options(selectinload(ProgramShare.user))
    )
    shares = result.scalars().all()

    return [
        ProgramShareResponse(
            id=s.id,
            program_id=s.program_id,
            user_id=s.user_id,
            user_email=s.user.email,
            user_username=s.user.username,
            permission=s.permission,
            created_at=s.created_at
        )
        for s in shares
    ]


@router.post("/{program_id}/shares", response_model=ProgramShareResponse, status_code=status.HTTP_201_CREATED)
async def share_program(
    program_id: str,
    share_data: ProgramShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Share a program with another user."""
    result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner access required")

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == share_data.user_email)
    )
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    # Check if already shared
    result = await db.execute(
        select(ProgramShare)
        .where(ProgramShare.program_id == program_id, ProgramShare.user_id == target_user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Update permission
        existing.permission = share_data.permission
        await db.commit()
        await db.refresh(existing)
        share = existing
    else:
        share = ProgramShare(
            program_id=program_id,
            user_id=target_user.id,
            permission=share_data.permission
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)

    return ProgramShareResponse(
        id=share.id,
        program_id=share.program_id,
        user_id=share.user_id,
        user_email=target_user.email,
        user_username=target_user.username,
        permission=share.permission,
        created_at=share.created_at
    )


@router.delete("/{program_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_share(
    program_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a share from a program."""
    result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    program = result.scalar_one_or_none()

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner access required")

    result = await db.execute(
        select(ProgramShare).where(ProgramShare.id == share_id, ProgramShare.program_id == program_id)
    )
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    await db.delete(share)
    await db.commit()
