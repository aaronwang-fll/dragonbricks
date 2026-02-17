"""
Parser API endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.api.llm import call_anthropic, call_openai
from app.core.config import settings
from app.core.security import get_current_user_optional
from app.models.user import User
from app.schemas.parser import (
    AutocompleteRequest,
    AutocompleteResponse,
    ClarificationSchema,
    ParsedCommandSchema,
    ParseRequest,
    ParseResponse,
    PreviewPathRequest,
    PreviewPathResponse,
    SuggestionSchema,
    ValidateRequest,
    ValidateResponse,
)
from app.services.parser import (
    ANGLE_COMPLETIONS,
    COMMAND_TEMPLATES,
    DISTANCE_COMPLETIONS,
    DURATION_COMPLETIONS,
    calculate_preview_path_response,
    generate_full_program,
    parse_command,
)
from app.services.parser.codegen import RoutineDefinition
from app.services.parser.parser import ParseResult, RobotConfig
from app.services.parser.preview import PreviewPoint

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
    status = "parsed"
    if not result.success:
        if result.needs_clarification:
            status = "needs_clarification"
        elif result.needs_llm:
            status = "needs_llm"
        else:
            status = "error"

    clarification = None
    if result.needs_clarification:
        clarification = ClarificationSchema(
            field=result.needs_clarification.field,
            message=result.needs_clarification.message,
            type=result.needs_clarification.type,
        )

    return ParsedCommandSchema(
        original=original,
        python_code=result.python_code,
        status=status,
        error=result.error,
        clarification=clarification,
        command_type=result.command_type,
        confidence=result.confidence,
    )


async def try_llm_help(command: str, field: str, default_message: str) -> str:
    """Use LLM to generate a helpful clarification message."""
    prompt = f"""The user typed: "{command}"

This command is missing the {field}. Generate a brief, helpful hint (max 15 words) explaining what's needed and give an example. Format: "[what's missing] — e.g., [example]"

Examples of good responses:
- "Distance needed — e.g., move forward 200mm"
- "Angle needed — e.g., turn left 90 degrees"
- "Duration needed — e.g., wait 2 seconds"

Respond with ONLY the hint, nothing else."""

    try:
        if settings.OPENAI_API_KEY:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 50,
                    },
                    timeout=5.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
        elif settings.ANTHROPIC_API_KEY:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": settings.ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 50,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    timeout=5.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["content"][0]["text"].strip()
    except Exception:
        pass

    return default_message


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
            code, _ = await call_openai(prompt, settings.DEFAULT_LLM_MODEL or "gpt-4o-mini")
            return ParseResult(success=True, python_code=code, confidence=0.85, command_type="llm")
        # Fall back to Anthropic
        elif settings.ANTHROPIC_API_KEY:
            code, _ = await call_anthropic(prompt)
            return ParseResult(success=True, python_code=code, confidence=0.85, command_type="llm")
    except Exception:
        pass

    return ParseResult(success=False, error="LLM parsing not available", confidence=0)


@router.post("/parse", response_model=ParseResponse)
async def parse_commands(
    request: ParseRequest, _current_user: User = Depends(get_current_user_optional)
):
    """Parse natural language commands and generate Python code."""
    config = config_from_schema(request.config)

    # Extract motor names (attachment1, attachment2, or custom names)
    motor_names: List[str] = []
    if config.attachment1_port:
        motor_names.append("attachment1")
    if config.attachment2_port:
        motor_names.append("attachment2")

    # Extract routine names for routine call parsing
    routine_names = [r.name for r in request.routines]

    # Convert routines to RoutineDefinition for code generation
    routine_defs = [
        RoutineDefinition(name=r.name, parameters=r.parameters, body=r.body)
        for r in request.routines
    ]

    results: List[ParsedCommandSchema] = []
    python_codes: List[str] = []
    uses_multitask = False

    for command in request.commands:
        command = command.strip()
        if not command:
            continue

        # Parse with rule-based parser
        result = parse_command(command, config, motor_names, routine_names)

        # Try LLM fallback if needed
        if result.needs_llm and not result.success:
            llm_result = await try_llm_parse(command, config)
            if llm_result.success:
                result = llm_result

        # Enhance clarification messages with LLM
        if result.needs_clarification and (settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY):
            llm_message = await try_llm_help(
                command, result.needs_clarification.field, result.needs_clarification.message
            )
            result.needs_clarification.message = llm_message

        results.append(result_to_schema(command, result))

        if result.success and result.python_code:
            python_codes.append(result.python_code)
            # Track if any command uses multitask
            if result.command_type == "multitask":
                uses_multitask = True

    # Generate full program with routines and multitask support
    program = generate_full_program(
        config,
        python_codes,
        routines=routine_defs if routine_defs else None,
        uses_multitask=uses_multitask,
    )

    return ParseResponse(
        results=results, generated_code=program.full, imports=program.imports, setup=program.setup
    )


@router.post("/autocomplete", response_model=AutocompleteResponse)
async def get_autocomplete(
    request: AutocompleteRequest, _current_user: User = Depends(get_current_user_optional)
):
    """Get autocomplete suggestions based on current input."""
    text = request.text.lower()
    cursor = request.cursor_position

    # Get text before cursor
    text_before_cursor = text[:cursor].strip()
    words = text_before_cursor.split()
    last_word = words[-1] if words else ""

    suggestions: List[SuggestionSchema] = []

    # Check what type of completion is needed
    if not text_before_cursor:
        # Empty input - show command templates
        for template in COMMAND_TEMPLATES[:5]:
            suggestions.append(
                SuggestionSchema(
                    text=template["text"], label=template["label"], category=template["category"]
                )
            )
    elif any(w in text_before_cursor for w in ["move", "forward", "backward", "straight"]):
        # Movement context - suggest distances
        for dist in DISTANCE_COMPLETIONS:
            suggestions.append(
                SuggestionSchema(text=dist["text"], label=dist["label"], category="distance")
            )
    elif any(w in text_before_cursor for w in ["turn", "rotate", "spin"]):
        # Turn context - suggest angles
        for angle in ANGLE_COMPLETIONS:
            suggestions.append(
                SuggestionSchema(text=angle["text"], label=angle["label"], category="angle")
            )
    elif any(w in text_before_cursor for w in ["wait", "pause", "delay"]):
        # Wait context - suggest durations
        for dur in DURATION_COMPLETIONS:
            suggestions.append(
                SuggestionSchema(text=dur["text"], label=dur["label"], category="duration")
            )
    else:
        # General - filter templates by last word
        for template in COMMAND_TEMPLATES:
            if last_word and template["text"].startswith(last_word):
                suggestions.append(
                    SuggestionSchema(
                        text=template["text"],
                        label=template["label"],
                        category=template["category"],
                    )
                )

        # If no matches, show all templates
        if not suggestions:
            for template in COMMAND_TEMPLATES[:5]:
                suggestions.append(
                    SuggestionSchema(
                        text=template["text"],
                        label=template["label"],
                        category=template["category"],
                    )
                )

    return AutocompleteResponse(suggestions=suggestions[:10])


@router.post("/validate", response_model=ValidateResponse)
async def validate_command(
    request: ValidateRequest, _current_user: User = Depends(get_current_user_optional)
):
    """Validate a single command."""
    result = parse_command(request.command)

    clarification = None
    if result.needs_clarification:
        clarification = ClarificationSchema(
            field=result.needs_clarification.field,
            message=result.needs_clarification.message,
            type=result.needs_clarification.type,
        )

    return ValidateResponse(
        valid=result.success, error=result.error, needs_clarification=clarification
    )


@router.post("/preview", response_model=PreviewPathResponse)
async def calculate_preview_path(
    request: PreviewPathRequest, _current_user: User = Depends(get_current_user_optional)
):
    """Calculate robot movement preview path from generated Python commands."""
    try:
        response_data = calculate_preview_path_response(
            commands=request.commands,
            start_position=PreviewPoint(
                x=request.start_position.x,
                y=request.start_position.y,
                angle=request.start_position.angle,
                timestamp=request.start_position.timestamp,
            ),
            speed=request.defaults.speed,
            turn_rate=request.defaults.turn_rate,
            points_per_segment=request.points_per_segment,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return PreviewPathResponse(**response_data)
