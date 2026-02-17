"""
Parser API schemas.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RobotConfigSchema(BaseModel):
    """Robot configuration for parsing context."""

    left_motor_port: str = Field(default="A", description="Left motor port")
    right_motor_port: str = Field(default="B", description="Right motor port")
    wheel_diameter: float = Field(default=56, description="Wheel diameter in mm")
    axle_track: float = Field(default=112, description="Axle track in mm")
    speed: float = Field(default=200, description="Default speed in mm/s")
    acceleration: float = Field(default=700, description="Default acceleration")
    turn_rate: float = Field(default=150, description="Default turn rate in deg/s")
    turn_acceleration: float = Field(default=300, description="Turn acceleration")
    motor_speed: float = Field(default=200, description="Attachment motor speed")
    attachment1_port: Optional[str] = Field(default=None, description="Attachment motor 1 port")
    attachment2_port: Optional[str] = Field(default=None, description="Attachment motor 2 port")
    color_sensor_port: Optional[str] = Field(default=None, description="Color sensor port")
    ultrasonic_port: Optional[str] = Field(default=None, description="Ultrasonic sensor port")
    force_port: Optional[str] = Field(default=None, description="Force sensor port")


class RoutineSchema(BaseModel):
    """User-defined routine."""

    name: str
    parameters: List[str] = Field(default_factory=list)
    body: str


class ParseRequest(BaseModel):
    """Request to parse commands."""

    commands: List[str] = Field(
        ..., min_length=1, max_length=100, description="Natural language commands"
    )
    config: RobotConfigSchema = Field(default_factory=RobotConfigSchema)
    routines: List[RoutineSchema] = Field(default_factory=list)


class ClarificationSchema(BaseModel):
    """Clarification request for missing parameters."""

    field: str
    message: str
    type: Literal["distance", "angle", "duration"]


class ParsedCommandSchema(BaseModel):
    """Result of parsing a single command."""

    original: str = Field(..., description="Original natural language command")
    python_code: Optional[str] = Field(default=None, description="Generated Python code")
    status: Literal["parsed", "error", "needs_clarification", "needs_llm"] = Field(
        ..., description="Parse status"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")
    clarification: Optional[ClarificationSchema] = Field(
        default=None, description="Clarification request"
    )
    command_type: Optional[str] = Field(default=None, description="Type of command")
    confidence: float = Field(default=1.0, ge=0, le=1, description="Confidence score")


class ParseResponse(BaseModel):
    """Response from parsing commands."""

    results: List[ParsedCommandSchema] = Field(..., description="Parse results for each command")
    generated_code: str = Field(..., description="Full generated Python program")
    imports: str = Field(..., description="Import statements")
    setup: str = Field(..., description="Setup code")


class AutocompleteRequest(BaseModel):
    """Request for autocomplete suggestions."""

    text: str = Field(..., max_length=500, description="Current input text")
    cursor_position: int = Field(..., ge=0, description="Cursor position in text")


class SuggestionSchema(BaseModel):
    """Autocomplete suggestion."""

    text: str = Field(..., description="Text to insert")
    label: str = Field(..., description="Display label")
    category: str = Field(..., description="Suggestion category")


class AutocompleteResponse(BaseModel):
    """Response with autocomplete suggestions."""

    suggestions: List[SuggestionSchema] = Field(..., description="List of suggestions")


class ValidateRequest(BaseModel):
    """Request to validate a single command."""

    command: str = Field(..., min_length=1, max_length=500, description="Command to validate")


class ValidateResponse(BaseModel):
    """Response from validating a command."""

    valid: bool = Field(..., description="Whether command is valid")
    error: Optional[str] = Field(default=None, description="Error message if invalid")
    needs_clarification: Optional[ClarificationSchema] = Field(
        default=None, description="Clarification if needed"
    )


class PreviewPointSchema(BaseModel):
    """Point in the preview path."""

    x: float = Field(..., description="X coordinate in canvas pixels")
    y: float = Field(..., description="Y coordinate in canvas pixels")
    angle: float = Field(..., description="Heading angle in degrees")
    timestamp: float = Field(..., ge=0, description="Timestamp in milliseconds")


class PreviewSegmentSchema(BaseModel):
    """Segment in a calculated preview path."""

    type: Literal["straight", "turn", "wait"]
    start_point: PreviewPointSchema
    end_point: PreviewPointSchema
    command: str


class PreviewPathSchema(BaseModel):
    """Calculated path output."""

    segments: List[PreviewSegmentSchema] = Field(default_factory=list)
    total_time: float = Field(..., ge=0, description="Total estimated duration in milliseconds")
    end_position: PreviewPointSchema


class PreviewDefaultsSchema(BaseModel):
    """Preview-only defaults needed for timing."""

    speed: float = Field(default=200, gt=0, description="Robot speed in mm/s")
    turn_rate: float = Field(default=150, gt=0, description="Robot turn rate in deg/s")


class PreviewPathRequest(BaseModel):
    """Request to calculate movement preview path."""

    commands: List[str] = Field(
        ..., min_length=1, max_length=500, description="Generated python commands"
    )
    start_position: PreviewPointSchema = Field(
        ..., description="Starting point on the preview canvas"
    )
    defaults: PreviewDefaultsSchema = Field(default_factory=PreviewDefaultsSchema)
    points_per_segment: int = Field(
        default=20, ge=2, le=200, description="Number of sampled points per segment"
    )


class PreviewPathResponse(BaseModel):
    """Response containing calculated path and sampled points."""

    path: PreviewPathSchema
    points: List[PreviewPointSchema] = Field(default_factory=list)
