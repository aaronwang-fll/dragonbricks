from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.llm import LLMParseRequest, LLMParseResponse, LLMBatchParseRequest, LLMBatchParseResponse

router = APIRouter()

SYSTEM_PROMPT = """You are a Pybricks Python code generator for LEGO SPIKE Prime robots.

Convert natural language commands to Pybricks Python code. The robot uses:
- DriveBase for movement (drive.straight(), drive.turn(), drive.curve())
- Individual Motor objects for attachments
- ColorSensor, UltrasonicSensor, ForceSensor

Output ONLY valid Python code, no explanations. Each command should be a single line or small block.

Examples:
- "move forward 200mm" → drive.straight(200)
- "turn right 90 degrees" → drive.turn(90)
- "wait 1 second" → wait(1000)
- "run grabber 180 degrees" → grabber.run_angle(200, 180)
- "wait until color is red" → while color_sensor.color() != Color.RED: wait(10)
- "follow line for 500mm" → # Line following code block
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
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 500
            },
            timeout=30.0
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
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "max_tokens": 500,
                "system": SYSTEM_PROMPT,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30.0
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Anthropic API error: {response.text}")

        data = response.json()
        content = data["content"][0]["text"]
        tokens = data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0)

        # Clean up code block markers if present
        if content.startswith("```python"):
            content = content[9:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]

        return content.strip(), tokens


@router.post("/parse", response_model=LLMParseResponse)
async def parse_command(
    request: LLMParseRequest,
    _current_user: User = Depends(get_current_user)
):
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
            success=True,
            python_code=code,
            provider=provider,
            model=model,
            tokens_used=tokens
        )
    except HTTPException:
        raise
    except Exception as e:
        return LLMParseResponse(
            success=False,
            error=str(e),
            provider=provider,
            model=model or "unknown"
        )


@router.post("/parse/batch", response_model=LLMBatchParseResponse)
async def parse_commands_batch(
    request: LLMBatchParseRequest,
    _current_user: User = Depends(get_current_user)
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
