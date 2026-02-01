from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class TeamRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Team(Base):
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)

    # Team settings (robot defaults, etc.)
    settings = Column(Text, nullable=True)  # JSON

    # Invite code for joining
    invite_code = Column(String(20), unique=True, index=True, nullable=True)
    invite_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    programs = relationship("Program", back_populates="team", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Team {self.name}>"


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(TeamRole), default=TeamRole.MEMBER, nullable=False)

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

    def __repr__(self):
        return f"<TeamMember {self.user_id} in {self.team_id}>"
