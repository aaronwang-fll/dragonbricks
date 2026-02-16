from typing import List, Literal, Optional

from pydantic import BaseModel, Field


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
    commands: List[str] = Field(..., min_length=1, max_length=50)
    context: Optional[str] = None


class LLMBatchParseResponse(BaseModel):
    results: List[LLMParseResponse]
    total_tokens: int = 0
