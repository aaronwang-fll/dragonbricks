"""
Fuzzy string matching using Levenshtein distance.
"""

from typing import List, Optional, Tuple


def levenshtein_distance(a: str, b: str) -> int:
    """Calculate Levenshtein distance between two strings."""
    if len(a) < len(b):
        return levenshtein_distance(b, a)

    if len(b) == 0:
        return len(a)

    previous_row = list(range(len(b) + 1))

    for i, c1 in enumerate(a):
        current_row = [i + 1]
        for j, c2 in enumerate(b):
            # j+1 instead of j since previous_row and current_row are one character longer
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def is_fuzzy_match(input_str: str, target: str, max_distance: int = 3) -> bool:
    """Check if two strings are fuzzy matches (Levenshtein distance <= max_distance)."""
    input_lower = input_str.lower()
    target_lower = target.lower()

    if input_lower == target_lower:
        return True

    return levenshtein_distance(input_lower, target_lower) <= max_distance


def find_best_match(
    input_str: str, options: List[str], max_distance: int = 3
) -> Optional[Tuple[str, int]]:
    """Find best fuzzy match from a list of options."""
    input_lower = input_str.lower()
    best_match: Optional[str] = None
    best_distance = float("inf")

    for option in options:
        distance = levenshtein_distance(input_lower, option.lower())
        if distance < best_distance and distance <= max_distance:
            best_match = option
            best_distance = distance

    if best_match is not None:
        return (best_match, int(best_distance))
    return None
