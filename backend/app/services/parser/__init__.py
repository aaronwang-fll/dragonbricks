"""
Parser service - Converts natural language commands to Pybricks Python code.
"""

from .parser import parse_command, parse_commands
from .codegen import generate_full_program
from .tokenizer import tokenize
from .patterns import COMMAND_TEMPLATES, DISTANCE_COMPLETIONS, ANGLE_COMPLETIONS, DURATION_COMPLETIONS

__all__ = [
    'parse_command',
    'parse_commands',
    'generate_full_program',
    'tokenize',
    'COMMAND_TEMPLATES',
    'DISTANCE_COMPLETIONS',
    'ANGLE_COMPLETIONS',
    'DURATION_COMPLETIONS',
]
