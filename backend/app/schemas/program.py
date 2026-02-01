from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from app.models.program import SharePermission


class RoutineSchema(BaseModel):
    id: str
    name: str
    parameters: List[str] = []
    body: str


class DefaultsSchema(BaseModel):
    speed: int = 200
    acceleration: int = 700
    turnRate: int = 150
    turnAcceleration: int = 300
    wheelDiameter: int = 56
    axleTrack: int = 112
    motorSpeed: int = 200
    lineThreshold: int = 50
    leftMotorPort: str = "A"
    rightMotorPort: str = "B"
    attachment1Port: str = "None"
    attachment2Port: str = "None"
    colorSensorPort: str = "C"
    ultrasonicPort: str = "D"
    forcePort: str = "None"


class ProgramCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    team_id: Optional[str] = None
    setup_section: Optional[dict] = None
    main_section: Optional[str] = None
    routines: Optional[List[RoutineSchema]] = None
    defaults: Optional[DefaultsSchema] = None


class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    team_id: Optional[str] = None
    setup_section: Optional[dict] = None
    main_section: Optional[str] = None
    routines: Optional[List[RoutineSchema]] = None
    defaults: Optional[DefaultsSchema] = None
    generated_code: Optional[str] = None
    is_public: Optional[bool] = None


class ProgramOwnerResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str]

    class Config:
        from_attributes = True


class ProgramResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    owner: Optional[ProgramOwnerResponse]
    team_id: Optional[str]
    setup_section: Optional[Any]
    main_section: Optional[str]
    routines: Optional[List[RoutineSchema]]
    defaults: Optional[DefaultsSchema]
    generated_code: Optional[str]
    is_public: bool
    share_code: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProgramListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    owner_username: Optional[str]
    team_id: Optional[str]
    is_public: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProgramShareCreate(BaseModel):
    user_email: str  # Email of user to share with
    permission: SharePermission = SharePermission.VIEW


class ProgramShareResponse(BaseModel):
    id: str
    program_id: str
    user_id: str
    user_email: str
    user_username: str
    permission: SharePermission
    created_at: datetime

    class Config:
        from_attributes = True


class ProgramForkRequest(BaseModel):
    name: Optional[str] = None  # New name, defaults to "Copy of {original}"
