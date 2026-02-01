from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
import secrets

from app.core.database import Base


class SharePermission(str, enum.Enum):
    VIEW = "view"       # Can view and copy
    COMMENT = "comment" # Can view and comment
    EDIT = "edit"       # Can edit


class Program(Base):
    __tablename__ = "programs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Owner (user who created it)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional team (if shared with team)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    # Program content (JSON)
    setup_section = Column(Text, nullable=True)      # JSON: robot configuration
    main_section = Column(Text, nullable=True)       # Natural language commands
    routines = Column(Text, nullable=True)           # JSON: [{name, parameters, body}]
    generated_code = Column(Text, nullable=True)     # Generated Python code

    # Robot defaults for this program
    defaults = Column(Text, nullable=True)           # JSON: speed, turnRate, etc.

    # Sharing
    is_public = Column(Boolean, default=False)       # Anyone with link can view
    share_code = Column(String(20), unique=True, index=True, nullable=True)

    # Versioning
    version = Column(Integer, default=1)
    parent_id = Column(String(36), ForeignKey("programs.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="programs")
    team = relationship("Team", back_populates="programs")
    shares = relationship("ProgramShare", back_populates="program", cascade="all, delete-orphan")
    parent = relationship("Program", remote_side=[id], backref="forks")

    def generate_share_code(self):
        """Generate a unique share code for this program."""
        self.share_code = secrets.token_urlsafe(12)
        return self.share_code

    def __repr__(self):
        return f"<Program {self.name}>"


class ProgramShare(Base):
    """Explicit sharing with specific users (beyond team sharing)."""
    __tablename__ = "program_shares"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    program_id = Column(String(36), ForeignKey("programs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(Enum(SharePermission), default=SharePermission.VIEW, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    program = relationship("Program", back_populates="shares")
    user = relationship("User")

    def __repr__(self):
        return f"<ProgramShare {self.program_id} -> {self.user_id}>"
