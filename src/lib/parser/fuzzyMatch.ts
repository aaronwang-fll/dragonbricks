/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two strings are fuzzy matches (Levenshtein distance <= maxDistance)
 */
export function isFuzzyMatch(input: string, target: string, maxDistance = 3): boolean {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();

  if (inputLower === targetLower) return true;

  return levenshteinDistance(inputLower, targetLower) <= maxDistance;
}

/**
 * Find best fuzzy match from a list of options
 */
export function findBestMatch(
  input: string,
  options: string[],
  maxDistance = 3
): { match: string; distance: number } | null {
  const inputLower = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(inputLower, option.toLowerCase());
    if (distance < bestDistance && distance <= maxDistance) {
      bestMatch = option;
      bestDistance = distance;
    }
  }

  return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
}
