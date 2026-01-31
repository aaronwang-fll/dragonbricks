import { findBestMatch } from './fuzzyMatch';
import * as patterns from './patterns';

export interface Token {
  type: 'verb' | 'direction' | 'number' | 'unit' | 'color' | 'motor' | 'speed' | 'word' | 'unknown';
  value: string;
  normalized?: string;
  numericValue?: number;
}

// Common filler words to ignore
const FILLER_WORDS = ['for', 'to', 'the', 'a', 'an', 'of', 'by', 'at', 'in', 'on', 'and', 'then'];

// Words that should NOT be fuzzy matched to verbs (they have other meanings)
const VERB_BLACKLIST = ['speed', 'slow', 'fast', 'quick', 'rate'];

const ALL_VERBS = [
  ...patterns.MOVE_VERBS,
  ...patterns.TURN_VERBS,
  ...patterns.WAIT_VERBS,
  ...patterns.RUN_VERBS,
  ...patterns.STOP_VERBS,
];

const ALL_DIRECTIONS = [
  ...patterns.FORWARD_WORDS,
  ...patterns.BACKWARD_WORDS,
  ...patterns.LEFT_WORDS,
  ...patterns.RIGHT_WORDS,
];

const ALL_UNITS = [
  ...Object.keys(patterns.UNIT_CONVERSIONS),
  ...Object.keys(patterns.TIME_CONVERSIONS),
  ...patterns.ANGLE_UNITS,
];

export function tokenize(input: string): Token[] {
  // Split on whitespace and punctuation, keeping numbers with units together
  const words = input
    .toLowerCase()
    .replace(/[,:;!?]/g, ' ')  // Don't replace . since it's used in decimals
    .split(/\s+/)
    .filter(Boolean);

  const tokens: Token[] = [];

  for (const word of words) {
    // Check for number (possibly with unit attached like "10.5cm" or "200mm")
    const numMatch = word.match(/^(-?\d+(?:\.\d+)?)([a-z]*)$/);
    if (numMatch) {
      const [, numStr, unitStr] = numMatch;
      tokens.push({
        type: 'number',
        value: numStr,
        numericValue: parseFloat(numStr),
      });
      if (unitStr) {
        tokens.push(classifyWord(unitStr));
      }
      continue;
    }

    tokens.push(classifyWord(word));
  }

  return tokens;
}

function classifyWord(word: string): Token {
  // Ignore filler words
  if (FILLER_WORDS.includes(word)) {
    return { type: 'word', value: word };
  }

  // Try exact matches first
  if (ALL_VERBS.includes(word)) {
    return { type: 'verb', value: word, normalized: word };
  }

  if (ALL_DIRECTIONS.includes(word)) {
    return { type: 'direction', value: word, normalized: normalizeDirection(word) };
  }

  if (ALL_UNITS.includes(word)) {
    return { type: 'unit', value: word, normalized: word };
  }

  if (patterns.COLORS.includes(word)) {
    return { type: 'color', value: word, normalized: word };
  }

  if (patterns.MOTOR_WORDS.includes(word)) {
    return { type: 'motor', value: word, normalized: word };
  }

  if (patterns.SPEED_WORDS.includes(word)) {
    return { type: 'speed', value: word, normalized: 'speed' };
  }

  // Try fuzzy matching with stricter tolerance
  // Only fuzzy match if the word is at least 4 characters and the match is close
  if (word.length >= 4 && !VERB_BLACKLIST.includes(word)) {
    const verbMatch = findBestMatch(word, ALL_VERBS, 2);
    if (verbMatch) {
      return { type: 'verb', value: word, normalized: verbMatch.match };
    }

    const dirMatch = findBestMatch(word, ALL_DIRECTIONS, 2);
    if (dirMatch) {
      return { type: 'direction', value: word, normalized: normalizeDirection(dirMatch.match) };
    }
  }

  const unitMatch = findBestMatch(word, ALL_UNITS, 2);
  if (unitMatch) {
    return { type: 'unit', value: word, normalized: unitMatch.match };
  }

  const colorMatch = findBestMatch(word, patterns.COLORS, 2);
  if (colorMatch) {
    return { type: 'color', value: word, normalized: colorMatch.match };
  }

  return { type: 'word', value: word };
}

function normalizeDirection(dir: string): string {
  if (patterns.FORWARD_WORDS.includes(dir)) return 'forward';
  if (patterns.BACKWARD_WORDS.includes(dir)) return 'backward';
  if (patterns.LEFT_WORDS.includes(dir)) return 'left';
  if (patterns.RIGHT_WORDS.includes(dir)) return 'right';
  return dir;
}
