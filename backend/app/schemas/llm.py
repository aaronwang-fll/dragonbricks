from pydantic import BaseModel, Field
from typing import Optional, Literal


class LLMParseRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=1000)
    context: Optional[str] = None  # Additional context about the program
    provider: Optional[Literal["openai", "anthropic"]] = None  # Override default
    model: Optional[str] = None  # Override default model


class LLMParseResponse(BaseModel):
    success: bool
    python_code: Optional[str] = None
    error: Optional[str] = None
    provider: str
    model: str
    tokens_used: Optional[int] = None


class LLMBatchParseRequest(BaseModel):
    commands: list[str] = Field(..., min_items=1, max_items=50)
    context: Optional[str] = None


class LLMBatchParseResponse(BaseModel):
    results: list[LLMParseResponse]
    total_tokens: int = 0
