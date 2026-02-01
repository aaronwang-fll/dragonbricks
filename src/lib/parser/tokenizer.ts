import { findBestMatch } from './fuzzyMatch';
import * as patterns from './patterns';

export interface Token {
  type: 'verb' | 'direction' | 'number' | 'unit' | 'color' | 'motor' | 'speed' | 'word' | 'unknown' |
        'repeat' | 'times' | 'define' | 'mission' | 'sensor' | 'condition' | 'comparison' |
        'until' | 'while' | 'parallel' | 'precise' | 'if' | 'then' | 'else' | 'line' | 'follow' | 'call';
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
  ...patterns.SET_VERBS,
  ...patterns.FOLLOW_VERBS,
  ...patterns.CALL_VERBS,
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
  // Ignore filler words (but not 'and' which is used for parallel)
  if (FILLER_WORDS.includes(word) && word !== 'and') {
    return { type: 'word', value: word };
  }

  // Advanced FLL patterns - check these first as they're more specific
  if (patterns.REPEAT_VERBS.includes(word)) {
    return { type: 'repeat', value: word, normalized: 'repeat' };
  }

  if (patterns.TIMES_WORDS.includes(word)) {
    return { type: 'times', value: word, normalized: 'times' };
  }

  if (patterns.DEFINE_VERBS.includes(word)) {
    return { type: 'define', value: word, normalized: 'define' };
  }

  if (patterns.MISSION_WORDS.includes(word)) {
    return { type: 'mission', value: word, normalized: 'mission' };
  }

  if (patterns.SENSOR_WORDS.includes(word)) {
    return { type: 'sensor', value: word, normalized: word };
  }

  if (patterns.UNTIL_WORDS.includes(word)) {
    return { type: 'until', value: word, normalized: 'until' };
  }

  if (patterns.WHILE_WORDS.includes(word)) {
    return { type: 'while', value: word, normalized: 'while' };
  }

  if (patterns.CONDITION_WORDS.includes(word)) {
    return { type: 'condition', value: word, normalized: word };
  }

  if (patterns.COMPARISON_WORDS.includes(word)) {
    return { type: 'comparison', value: word, normalized: normalizeComparison(word) };
  }

  if (patterns.PARALLEL_WORDS.includes(word)) {
    return { type: 'parallel', value: word, normalized: 'parallel' };
  }

  if (patterns.PRECISE_WORDS.includes(word)) {
    return { type: 'precise', value: word, normalized: 'precise' };
  }

  if (patterns.IF_WORDS.includes(word)) {
    return { type: 'if', value: word, normalized: 'if' };
  }

  if (patterns.THEN_WORDS.includes(word)) {
    return { type: 'then', value: word, normalized: 'then' };
  }

  if (patterns.ELSE_WORDS.includes(word)) {
    return { type: 'else', value: word, normalized: 'else' };
  }

  if (patterns.LINE_WORDS.includes(word)) {
    return { type: 'line', value: word, normalized: 'line' };
  }

  if (patterns.FOLLOW_VERBS.includes(word)) {
    return { type: 'follow', value: word, normalized: 'follow' };
  }

  if (patterns.CALL_VERBS.includes(word)) {
    return { type: 'call', value: word, normalized: 'call' };
  }

  // Try exact matches for basic verbs
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

function normalizeComparison(comp: string): string {
  if (['greater', 'more', 'above'].includes(comp)) return '>';
  if (['less', 'below'].includes(comp)) return '<';
  if (['equals', 'equal'].includes(comp)) return '==';
  return comp;
}

function normalizeDirection(dir: string): string {
  if (patterns.FORWARD_WORDS.includes(dir)) return 'forward';
  if (patterns.BACKWARD_WORDS.includes(dir)) return 'backward';
  if (patterns.LEFT_WORDS.includes(dir)) return 'left';
  if (patterns.RIGHT_WORDS.includes(dir)) return 'right';
  return dir;
}
