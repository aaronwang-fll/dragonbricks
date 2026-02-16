"""
Parser service - Converts natural language commands to Pybricks Python code.
"""

from .codegen import generate_full_program
from .parser import parse_command, parse_commands
from .patterns import (
    ANGLE_COMPLETIONS,
    COMMAND_TEMPLATES,
    DISTANCE_COMPLETIONS,
    DURATION_COMPLETIONS,
)
from .tokenizer import tokenize

__all__ = [
    "parse_command",
    "parse_commands",
    "generate_full_program",
    "tokenize",
    "COMMAND_TEMPLATES",
    "DISTANCE_COMPLETIONS",
    "ANGLE_COMPLETIONS",
    "DURATION_COMPLETIONS",
]
