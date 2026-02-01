"""
Parser API endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.parser import (
    ParseRequest, ParseResponse, ParsedCommandSchema, ClarificationSchema,
    AutocompleteRequest, AutocompleteResponse, SuggestionSchema,
    ValidateRequest, ValidateResponse
)
from app.services.parser import (
    parse_command, generate_full_program,
    COMMAND_TEMPLATES, DISTANCE_COMPLETIONS, ANGLE_COMPLETIONS, DURATION_COMPLETIONS
)
from app.services.parser.parser import RobotConfig, ParseResult
from app.api.llm import call_openai, call_anthropic
from app.core.config import settings

router = APIRouter()


def config_from_schema(schema) -> RobotConfig:
    """Convert schema to RobotConfig."""
    return RobotConfig(
        left_motor_port=schema.left_motor_port,
        right_motor_port=schema.right_motor_port,
        wheel_diameter=schema.wheel_diameter,
        axle_track=schema.axle_track,
        speed=schema.speed,
        acceleration=schema.acceleration,
        turn_rate=schema.turn_rate,
        turn_acceleration=schema.turn_acceleration,
        motor_speed=schema.motor_speed,
        attachment1_port=schema.attachment1_port,
        attachment2_port=schema.attachment2_port,
        color_sensor_port=schema.color_sensor_port,
        ultrasonic_port=schema.ultrasonic_port,
        force_port=schema.force_port,
    )


def result_to_schema(original: str, result: ParseResult) -> ParsedCommandSchema:
    """Convert ParseResult to schema."""
    status = 'parsed'
    if not result.success:
        if result.needs_clarification:
            status = 'needs_clarification'
        elif result.needs_llm:
            status = 'needs_llm'
        else:
            status = 'error'

    clarification = None
    if result.needs_clarification:
        clarification = ClarificationSchema(
            field=result.needs_clarification.field,
            message=result.needs_clarification.message,
            type=result.needs_clarification.type
        )

    return ParsedCommandSchema(
        original=original,
        python_code=result.python_code,
        status=status,
        error=result.error,
        clarification=clarification,
        command_type=result.command_type,
        confidence=result.confidence
    )


async def try_llm_parse(command: str, config: RobotConfig) -> ParseResult:
    """Try parsing with LLM as fallback."""
    context = f"""Robot configuration:
- Left motor: Port {config.left_motor_port}
- Right motor: Port {config.right_motor_port}
- Wheel diameter: {config.wheel_diameter}mm
- Axle track: {config.axle_track}mm
- Default speed: {config.speed}mm/s"""

    prompt = f"Convert this command to Pybricks Python code: {command}"
    if context:
        prompt = f"{context}\n\n{prompt}"

    try:
        # Try OpenAI first
        if settings.OPENAI_API_KEY:
            code, _ = await call_openai(prompt, settings.DEFAULT_LLM_MODEL or "gpt-5-mini")
            return ParseResult(
                success=True,
                python_code=code,
                confidence=0.85,
                command_type='llm'
            )
        # Fall back to Anthropic
        elif settings.ANTHROPIC_API_KEY:
            code, _ = await call_anthropic(prompt)
            return ParseResult(
                success=True,
                python_code=code,
                confidence=0.85,
                command_type='llm'
            )
    except Exception as e:
        pass

    return ParseResult(
        success=False,
        error='LLM parsing not available',
        confidence=0
    )


@router.post("/parse", response_model=ParseResponse)
async def parse_commands(
    request: ParseRequest,
    _current_user: User = Depends(get_current_user_optional)
):
    """Parse natural language commands and generate Python code."""
    config = config_from_schema(request.config)
    motor_names = [r.name for r in request.routines]

    results: List[ParsedCommandSchema] = []
    python_codes: List[str] = []

    for command in request.commands:
        command = command.strip()
        if not command:
            continue

        # Parse with rule-based parser
        result = parse_command(command, config, motor_names)

        # Try LLM fallback if needed
        if result.needs_llm and not result.success:
            llm_result = await try_llm_parse(command, config)
            if llm_result.success:
                result = llm_result

        results.append(result_to_schema(command, result))

        if result.success and result.python_code:
            python_codes.append(result.python_code)

    # Generate full program
    program = generate_full_program(config, python_codes)

    return ParseResponse(
        results=results,
        generated_code=program.full,
        imports=program.imports,
        setup=program.setup
    )


@router.post("/autocomplete", response_model=AutocompleteResponse)
async def get_autocomplete(
    request: AutocompleteRequest,
    _current_user: User = Depends(get_current_user_optional)
):
    """Get autocomplete suggestions based on current input."""
    text = request.text.lower()
    cursor = request.cursor_position

    # Get text before cursor
    text_before_cursor = text[:cursor].strip()
    words = text_before_cursor.split()
    last_word = words[-1] if words else ''

    suggestions: List[SuggestionSchema] = []

    # Check what type of completion is needed
    if not text_before_cursor:
        # Empty input - show command templates
        for template in COMMAND_TEMPLATES[:5]:
            suggestions.append(SuggestionSchema(
                text=template['text'],
                label=template['label'],
                category=template['category']
            ))
    elif any(w in text_before_cursor for w in ['move', 'forward', 'backward', 'straight']):
        # Movement context - suggest distances
        for dist in DISTANCE_COMPLETIONS:
            suggestions.append(SuggestionSchema(
                text=dist['text'],
                label=dist['label'],
                category='distance'
            ))
    elif any(w in text_before_cursor for w in ['turn', 'rotate', 'spin']):
        # Turn context - suggest angles
        for angle in ANGLE_COMPLETIONS:
            suggestions.append(SuggestionSchema(
                text=angle['text'],
                label=angle['label'],
                category='angle'
            ))
    elif any(w in text_before_cursor for w in ['wait', 'pause', 'delay']):
        # Wait context - suggest durations
        for dur in DURATION_COMPLETIONS:
            suggestions.append(SuggestionSchema(
                text=dur['text'],
                label=dur['label'],
                category='duration'
            ))
    else:
        # General - filter templates by last word
        for template in COMMAND_TEMPLATES:
            if last_word and template['text'].startswith(last_word):
                suggestions.append(SuggestionSchema(
                    text=template['text'],
                    label=template['label'],
                    category=template['category']
                ))

        # If no matches, show all templates
        if not suggestions:
            for template in COMMAND_TEMPLATES[:5]:
                suggestions.append(SuggestionSchema(
                    text=template['text'],
                    label=template['label'],
                    category=template['category']
                ))

    return AutocompleteResponse(suggestions=suggestions[:10])


@router.post("/validate", response_model=ValidateResponse)
async def validate_command(
    request: ValidateRequest,
    _current_user: User = Depends(get_current_user_optional)
):
    """Validate a single command."""
    result = parse_command(request.command)

    clarification = None
    if result.needs_clarification:
        clarification = ClarificationSchema(
            field=result.needs_clarification.field,
            message=result.needs_clarification.message,
            type=result.needs_clarification.type
        )

    return ValidateResponse(
        valid=result.success,
        error=result.error,
        needs_clarification=clarification
    )
