"""
Tokenizer for natural language command parsing.
"""

import re
from dataclasses import dataclass
from typing import List, Literal, Optional

from . import patterns
from .fuzzy_match import find_best_match

TokenType = Literal[
    "verb",
    "direction",
    "number",
    "unit",
    "color",
    "motor",
    "speed",
    "word",
    "unknown",
    "repeat",
    "times",
    "define",
    "mission",
    "sensor",
    "condition",
    "comparison",
    "until",
    "while",
    "parallel",
    "precise",
    "if",
    "then",
    "else",
    "line",
    "follow",
    "call",
    "arc",
    "beep",
    "display",
    "reset",
    "hold",
    "brake",
    "heading",
    "on",
    "off",
    "hub",
    "light",
]


@dataclass
class Token:
    type: TokenType
    value: str
    normalized: Optional[str] = None
    numeric_value: Optional[float] = None


def tokenize(input_str: str) -> List[Token]:
    """Convert input string to list of tokens."""
    # Split on whitespace and punctuation, keeping numbers with units together
    words = re.sub(r"[,:;!?]", " ", input_str.lower()).split()
    words = [w for w in words if w]

    tokens: List[Token] = []

    for word in words:
        # Check for number (possibly with unit attached like "10.5cm" or "200mm")
        num_match = re.match(r"^(-?\d+(?:\.\d+)?)([a-z]*)$", word)
        if num_match:
            num_str, unit_str = num_match.groups()
            tokens.append(Token(type="number", value=num_str, numeric_value=float(num_str)))
            if unit_str:
                tokens.append(classify_word(unit_str))
            continue

        tokens.append(classify_word(word))

    return tokens


def classify_word(word: str) -> Token:
    """Classify a word into a token type."""
    # Ignore filler words (but not 'and' which is used for parallel)
    if word in patterns.FILLER_WORDS and word != "and":
        return Token(type="word", value=word)

    # Advanced FLL patterns - check these first as they're more specific
    if word in patterns.REPEAT_VERBS:
        return Token(type="repeat", value=word, normalized="repeat")

    if word in patterns.TIMES_WORDS:
        return Token(type="times", value=word, normalized="times")

    if word in patterns.DEFINE_VERBS:
        return Token(type="define", value=word, normalized="define")

    if word in patterns.MISSION_WORDS:
        return Token(type="mission", value=word, normalized="mission")

    if word in patterns.SENSOR_WORDS:
        return Token(type="sensor", value=word, normalized=word)

    if word in patterns.UNTIL_WORDS:
        return Token(type="until", value=word, normalized="until")

    if word in patterns.WHILE_WORDS:
        return Token(type="while", value=word, normalized="while")

    if word in patterns.CONDITION_WORDS:
        return Token(type="condition", value=word, normalized=word)

    if word in patterns.COMPARISON_WORDS:
        return Token(type="comparison", value=word, normalized=normalize_comparison(word))

    if word in patterns.PARALLEL_WORDS:
        return Token(type="parallel", value=word, normalized="parallel")

    if word in patterns.PRECISE_WORDS:
        return Token(type="precise", value=word, normalized="precise")

    if word in patterns.IF_WORDS:
        return Token(type="if", value=word, normalized="if")

    if word in patterns.THEN_WORDS:
        return Token(type="then", value=word, normalized="then")

    if word in patterns.ELSE_WORDS:
        return Token(type="else", value=word, normalized="else")

    if word in patterns.LINE_WORDS:
        return Token(type="line", value=word, normalized="line")

    if word in patterns.FOLLOW_VERBS:
        return Token(type="follow", value=word, normalized="follow")

    if word in patterns.CALL_VERBS:
        return Token(type="call", value=word, normalized="call")

    # New Pybricks-specific patterns
    if word in patterns.ARC_VERBS:
        return Token(type="arc", value=word, normalized="arc")

    if word in patterns.BEEP_VERBS:
        return Token(type="beep", value=word, normalized="beep")

    if word in patterns.DISPLAY_VERBS:
        return Token(type="display", value=word, normalized="display")

    if word in patterns.RESET_WORDS:
        return Token(type="reset", value=word, normalized="reset")

    if word in patterns.HOLD_WORDS:
        return Token(type="hold", value=word, normalized="hold")

    if word in patterns.HEADING_WORDS:
        return Token(type="heading", value=word, normalized="heading")

    if word in patterns.ON_WORDS:
        return Token(type="on", value=word, normalized="on")

    if word in patterns.OFF_WORDS:
        return Token(type="off", value=word, normalized="off")

    if word in patterns.HUB_WORDS:
        return Token(type="hub", value=word, normalized="hub")

    if word in patterns.LIGHT_VERBS:
        return Token(type="light", value=word, normalized="light")

    # Try exact matches for basic verbs
    if word in patterns.ALL_VERBS:
        return Token(type="verb", value=word, normalized=word)

    if word in patterns.ALL_DIRECTIONS:
        return Token(type="direction", value=word, normalized=normalize_direction(word))

    if word in patterns.ALL_UNITS:
        return Token(type="unit", value=word, normalized=word)

    if word in patterns.COLORS:
        # Normalize color names to Pybricks constants
        normalized_color = word
        if word == "grey":
            normalized_color = "gray"
        return Token(type="color", value=word, normalized=normalized_color)

    if word in patterns.MOTOR_WORDS:
        return Token(type="motor", value=word, normalized=word)

    if word in patterns.SPEED_WORDS:
        return Token(type="speed", value=word, normalized="speed")

    # Try fuzzy matching with stricter tolerance
    # Only fuzzy match if the word is at least 4 characters and the match is close
    if len(word) >= 4 and word not in patterns.VERB_BLACKLIST:
        # Keep verb fuzzy matching conservative to avoid semantic mismatches
        # like "dance" -> "advance".
        verb_match = find_best_match(word, patterns.ALL_VERBS, 1)
        if verb_match and verb_match[0][0] == word[0]:
            return Token(type="verb", value=word, normalized=verb_match[0])

        dir_match = find_best_match(word, patterns.ALL_DIRECTIONS, 2)
        if dir_match:
            return Token(type="direction", value=word, normalized=normalize_direction(dir_match[0]))

    unit_match = find_best_match(word, patterns.ALL_UNITS, 2)
    if unit_match:
        return Token(type="unit", value=word, normalized=unit_match[0])

    color_match = find_best_match(word, patterns.COLORS, 2)
    if color_match:
        return Token(type="color", value=word, normalized=color_match[0])

    return Token(type="word", value=word)


def normalize_comparison(comp: str) -> str:
    """Normalize comparison word to operator."""
    if comp in ["greater", "more", "above"]:
        return ">"
    if comp in ["less", "below"]:
        return "<"
    if comp in ["equals", "equal"]:
        return "=="
    return comp


def normalize_direction(direction: str) -> str:
    """Normalize direction word."""
    if direction in patterns.FORWARD_WORDS:
        return "forward"
    if direction in patterns.BACKWARD_WORDS:
        return "backward"
    if direction in patterns.LEFT_WORDS:
        return "left"
    if direction in patterns.RIGHT_WORDS:
        return "right"
    return direction
