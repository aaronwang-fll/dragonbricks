import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.llm import (
    LLMBatchParseRequest,
    LLMBatchParseResponse,
    LLMParseRequest,
    LLMParseResponse,
)

router = APIRouter()

SYSTEM_PROMPT = """You are a Pybricks Python code generator for LEGO SPIKE Prime robots.

Convert natural language commands to Pybricks Python code. Output ONLY valid Python code, no explanations.

## PYBRICKS API REFERENCE

### DriveBase (robot variable)
- robot.straight(distance) - Drive straight in mm. Negative = backward.
- robot.turn(angle) - Turn in place. Positive = right, negative = left.
- robot.arc(radius, angle) - Drive arc. radius in mm, angle in degrees.
- robot.drive(speed, turn_rate) - Continuous driving. speed in mm/s, turn_rate in deg/s.
- robot.stop() - Coast to stop (motors spin freely)
- robot.brake() - Active braking
- robot.settings(straight_speed, straight_acceleration, turn_rate, turn_acceleration) - Configure speeds
- robot.distance() - Get distance traveled in mm
- robot.angle() - Get rotation angle in degrees
- robot.reset() - Reset odometry
- robot.use_gyro(True/False) - Enable/disable gyro heading correction
- robot.done() - Check if maneuver complete
- robot.stalled() - Check if stuck

### Motor (attachment1, attachment2, etc.)
- motor.run(speed) - Run continuously at deg/s
- motor.run_time(speed, time, then=Stop.HOLD, wait=True) - Run for time in ms
- motor.run_angle(speed, angle, then=Stop.HOLD, wait=True) - Rotate specific degrees
- motor.run_target(speed, target_angle, then=Stop.HOLD, wait=True) - Move to absolute position
- motor.run_until_stalled(speed, then=Stop.COAST, duty_limit=None) - Run until blocked
- motor.stop() - Coast
- motor.brake() - Passive brake
- motor.hold() - Active hold position
- motor.angle() - Current angle in degrees
- motor.speed() - Current speed in deg/s
- motor.reset_angle(angle=0) - Reset angle counter
- motor.stalled() - Check if stalled
- motor.done() - Check if command complete

### ColorSensor (color_sensor)
- color_sensor.color(surface=True) - Detect color: Color.RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, MAGENTA, WHITE, GRAY, BLACK, NONE
- color_sensor.reflection() - Surface reflection 0-100%
- color_sensor.ambient() - Ambient light 0-100%
- color_sensor.hsv() - Get (hue, saturation, value) tuple
- color_sensor.lights.on(brightness) - Turn on lights 0-100%
- color_sensor.lights.off() - Turn off lights

### UltrasonicSensor (distance_sensor)
- distance_sensor.distance() - Distance in mm (max 2000)
- distance_sensor.presence() - Detect other ultrasonic sensors nearby
- distance_sensor.lights.on(brightness) - Turn on lights
- distance_sensor.lights.off() - Turn off lights

### ForceSensor (force_sensor)
- force_sensor.force() - Force in Newtons (0-10N)
- force_sensor.distance() - Button travel in mm (0-8mm)
- force_sensor.pressed(force=3) - Check if pressed above threshold
- force_sensor.touched() - Check if any contact

### PrimeHub (hub)
- hub.imu.heading() - Gyro heading in degrees
- hub.imu.reset_heading(angle=0) - Reset heading
- hub.imu.acceleration() - (x, y, z) in mm/s²
- hub.imu.angular_velocity() - (x, y, z) in deg/s
- hub.imu.tilt() - (pitch, roll) in degrees
- hub.speaker.beep(frequency=500, duration=100) - Play tone
- hub.speaker.play_notes(notes, tempo=120) - Play melody
- hub.display.text(text) - Show scrolling text
- hub.display.number(number) - Show number
- hub.display.char(char) - Show character
- hub.display.off() - Clear display
- hub.light.on(color) - Set status light color
- hub.light.off() - Turn off status light
- hub.buttons.pressed() - Get set of pressed buttons

### Tools
- wait(time) - Pause for time in ms
- StopWatch() - Create timer: sw.time(), sw.pause(), sw.resume(), sw.reset()
- multitask(coro1(), coro2(), race=False) - Run async tasks in parallel

### Stop Modes (for then= parameter)
- Stop.HOLD - Actively hold position
- Stop.BRAKE - Passive braking
- Stop.COAST - Let spin freely

### Color Constants
Color.RED, Color.ORANGE, Color.YELLOW, Color.GREEN, Color.CYAN, Color.BLUE, Color.VIOLET, Color.MAGENTA, Color.WHITE, Color.GRAY, Color.BLACK, Color.NONE

## NATURAL LANGUAGE MAPPINGS

Movement:
- "move/go/drive forward/backward [distance]" → robot.straight(distance)
- "turn/rotate left/right [angle]" → robot.turn(angle) (negative for left)
- "curve/arc left/right [radius] [angle]" → robot.arc(radius, angle)
- "drive at speed [speed]" → robot.drive(speed, 0)

Motors:
- "run/spin [motor] [angle] degrees" → motor.run_angle(200, angle)
- "run [motor] for [time]" → motor.run_time(200, time_ms)
- "hold [motor]" → motor.hold()
- "stop [motor]" → motor.stop()
- "run [motor] until stuck/stalled" → motor.run_until_stalled(200)

Sensors:
- "wait until color is [color]" → while color_sensor.color() != Color.X: wait(10)
- "wait until distance < [value]" → while distance_sensor.distance() >= value: wait(10)
- "wait until pressed/touched" → while not force_sensor.pressed(): wait(10)
- "move forward until [condition]" → robot.drive(200,0); while condition: wait(10); robot.stop()

Line following:
- "follow line" → Use reflection() with PID control on left/right motors

Timing:
- "wait [time]" → wait(time_ms)
- "pause/delay [time]" → wait(time_ms)

Hub:
- "beep/buzz" → hub.speaker.beep()
- "show/display [text]" → hub.display.text(text)
- "reset heading/gyro" → hub.imu.reset_heading(0)

Parallel:
- "[action1] while [action2]" → Use multitask() with async functions

Match the user's intent to the closest Pybricks function. Output clean, runnable Python code.
"""


async def call_openai(prompt: str, model: str = "gpt-4o") -> tuple[str, int]:
    """Call OpenAI API."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 500,
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenAI API error: {response.text}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens = data.get("usage", {}).get("total_tokens", 0)

        # Clean up code block markers if present
        if content.startswith("```python"):
            content = content[9:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        return content.strip(), tokens


async def call_anthropic(prompt: str, model: str = "claude-3-5-sonnet-20241022") -> tuple[str, int]:
    """Call Anthropic API."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="Anthropic API key not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 500,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Anthropic API error: {response.text}")

        data = response.json()
        content = data["content"][0]["text"]
        tokens = data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get(
            "output_tokens", 0
        )

        # Clean up code block markers if present
        if content.startswith("```python"):
            content = content[9:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        return content.strip(), tokens


@router.post("/parse", response_model=LLMParseResponse)
async def parse_command(request: LLMParseRequest, _current_user: User = Depends(get_current_user)):
    """Parse a natural language command using LLM."""
    provider = request.provider or settings.DEFAULT_LLM_PROVIDER
    model = request.model

    prompt = f"Convert this command to Pybricks Python code: {request.command}"
    if request.context:
        prompt = f"Context: {request.context}\n\n{prompt}"

    try:
        if provider == "openai":
            model = model or "gpt-4o"
            code, tokens = await call_openai(prompt, model)
        else:
            model = model or "claude-3-5-sonnet-20241022"
            code, tokens = await call_anthropic(prompt, model)

        return LLMParseResponse(
            success=True, python_code=code, provider=provider, model=model, tokens_used=tokens
        )
    except HTTPException:
        raise
    except Exception as e:
        return LLMParseResponse(
            success=False, error=str(e), provider=provider, model=model or "unknown"
        )


@router.post("/parse/batch", response_model=LLMBatchParseResponse)
async def parse_commands_batch(
    request: LLMBatchParseRequest, _current_user: User = Depends(get_current_user)
):
    """Parse multiple commands in a batch."""
    results = []
    total_tokens = 0

    for command in request.commands:
        single_request = LLMParseRequest(command=command, context=request.context)
        result = await parse_command(single_request, _current_user)
        results.append(result)
        total_tokens += result.tokens_used or 0

    return LLMBatchParseResponse(results=results, total_tokens=total_tokens)
