import { tokenize } from './tokenizer';
import type { Token } from './tokenizer';
import * as patterns from './patterns';
import type { Defaults } from '../../types';
import { DEFAULT_VALUES } from '../../types';

export interface ParseResult {
  success: boolean;
  pythonCode?: string;
  needsClarification?: {
    field: string;
    message: string;
    type: 'distance' | 'angle' | 'duration';
  };
  error?: string;
  confidence: number;
}

export function parseCommand(
  input: string,
  defaults: Defaults = DEFAULT_VALUES,
  motorNames: string[] = []
): ParseResult {
  const tokens = tokenize(input);

  if (tokens.length === 0) {
    return { success: false, error: 'Empty command', confidence: 0 };
  }

  // Try to match different command patterns
  // Order matters: more specific patterns first

  const stopResult = tryParseStop(tokens, motorNames);
  if (stopResult) return stopResult;

  const motorResult = tryParseMotor(tokens, defaults, motorNames);
  if (motorResult) return motorResult;

  // Turn and Move before Wait - they're more common and specific
  const turnResult = tryParseTurn(tokens, defaults);
  if (turnResult) return turnResult;

  const moveResult = tryParseMove(tokens, defaults);
  if (moveResult) return moveResult;

  const waitResult = tryParseWait(tokens);
  if (waitResult) return waitResult;

  // No pattern matched
  return {
    success: false,
    error: 'Could not parse command',
    confidence: 0,
  };
}

function tryParseMove(tokens: Token[], defaults: Defaults): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.MOVE_VERBS.includes(t.normalized || t.value)
  );
  const direction = tokens.find((t) => t.type === 'direction');
  const unit = tokens.find((t) => t.type === 'unit' && patterns.UNIT_CONVERSIONS[t.normalized || t.value]);

  // Check if this looks like a move command
  if (!hasVerb && !direction) return null;
  if (direction && !['forward', 'backward'].includes(direction.normalized || '')) return null;

  // Find distance and speed values
  const numbers = tokens.filter((t) => t.type === 'number');
  const hasSpeedWord = tokens.some((t) => t.type === 'speed');

  // First number (or number with distance unit) is distance
  let distanceToken = numbers[0];
  let speedValue: number | null = null;

  // If there's a unit, the number before it is distance
  if (unit) {
    const unitIndex = tokens.indexOf(unit);
    for (let i = unitIndex - 1; i >= 0; i--) {
      if (tokens[i].type === 'number') {
        distanceToken = tokens[i];
        break;
      }
    }
  }

  if (numbers.length >= 2 && hasSpeedWord) {
    // Find speed value - it's the number after the speed word
    const speedWordIndex = tokens.findIndex((t) => t.type === 'speed');
    const speedNumber = tokens.slice(speedWordIndex).find((t) => t.type === 'number');
    if (speedNumber) {
      speedValue = speedNumber.numericValue || null;
    }
  } else if (numbers.length >= 2) {
    // Second number might be speed even without explicit "speed" word
    // e.g., "move forward 200 at 100"
    const atIndex = tokens.findIndex((t) => t.value === 'at');
    if (atIndex > -1) {
      const numberAfterAt = tokens.slice(atIndex).find((t) => t.type === 'number');
      if (numberAfterAt && numberAfterAt !== distanceToken) {
        speedValue = numberAfterAt.numericValue || null;
      }
    }
  }

  // Need distance - require clarification if missing
  if (!distanceToken) {
    return {
      success: false,
      needsClarification: {
        field: 'distance',
        message: 'How far should the robot move?',
        type: 'distance',
      },
      confidence: 0.7,
    };
  }

  // Calculate distance in mm
  let distance = distanceToken.numericValue || 0;
  if (unit) {
    const conversion = patterns.UNIT_CONVERSIONS[unit.normalized || unit.value];
    if (conversion) {
      distance *= conversion;
    }
  }

  // Negative for backward
  if (direction?.normalized === 'backward') {
    distance = -distance;
  }

  // Generate code with optional speed setting
  const straightSpeed = speedValue || defaults.speed;
  if (speedValue) {
    return {
      success: true,
      pythonCode: `robot.settings(straight_speed=${straightSpeed})\nrobot.straight(${distance})`,
      confidence: 0.95,
    };
  }

  return {
    success: true,
    pythonCode: `robot.straight(${distance})`,
    confidence: 0.95,
  };
}

function tryParseTurn(tokens: Token[], defaults: Defaults): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.TURN_VERBS.includes(t.normalized || t.value)
  );
  const direction = tokens.find((t) => t.type === 'direction');

  if (!hasVerb && !direction) return null;
  if (direction && !['left', 'right'].includes(direction.normalized || '')) return null;

  // Find angle and speed values
  // Pattern: "turn left 90 [degrees] [at/speed] 100"
  const numbers = tokens.filter((t) => t.type === 'number');
  const hasSpeedWord = tokens.some((t) => t.type === 'speed');

  // First number is angle, second (if after speed word) is speed
  const angleToken = numbers[0];
  let speedValue: number | null = null;

  if (numbers.length >= 2 && hasSpeedWord) {
    // Find speed value - it's the number after the speed word
    const speedWordIndex = tokens.findIndex((t) => t.type === 'speed');
    const speedNumber = tokens.slice(speedWordIndex).find((t) => t.type === 'number');
    if (speedNumber) {
      speedValue = speedNumber.numericValue || null;
    }
  } else if (numbers.length >= 2) {
    // Second number might be speed even without explicit "speed" word
    // e.g., "turn left 90 at 100"
    const atIndex = tokens.findIndex((t) => t.value === 'at');
    if (atIndex > -1) {
      const numberAfterAt = tokens.slice(atIndex).find((t) => t.type === 'number');
      if (numberAfterAt && numberAfterAt !== angleToken) {
        speedValue = numberAfterAt.numericValue || null;
      }
    }
  }

  // Need angle - require clarification if missing
  if (!angleToken) {
    return {
      success: false,
      needsClarification: {
        field: 'angle',
        message: 'What angle should the robot turn?',
        type: 'angle',
      },
      confidence: 0.7,
    };
  }

  let angle = angleToken.numericValue || 0;

  // Negative for left turn
  if (direction?.normalized === 'left') {
    angle = -angle;
  }

  // Generate code with optional speed setting
  const turnRate = speedValue || defaults.turnRate;
  if (speedValue) {
    return {
      success: true,
      pythonCode: `robot.settings(turn_rate=${turnRate})\nrobot.turn(${angle})`,
      confidence: 0.95,
    };
  }

  return {
    success: true,
    pythonCode: `robot.turn(${angle})`,
    confidence: 0.95,
  };
}

function tryParseWait(tokens: Token[]): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.WAIT_VERBS.includes(t.normalized || t.value)
  );

  if (!hasVerb) return null;

  const number = tokens.find((t) => t.type === 'number');
  const unit = tokens.find((t) => t.type === 'unit');

  // Need duration - require clarification if missing
  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'duration',
        message: 'How long should the robot wait?',
        type: 'duration',
      },
      confidence: 0.7,
    };
  }

  let duration = number.numericValue || 0;
  if (unit) {
    const conversion = patterns.TIME_CONVERSIONS[unit.normalized || unit.value];
    if (conversion) {
      duration *= conversion;
    } else {
      // Default to seconds if unit looks like time but not recognized
      duration *= 1000;
    }
  } else {
    // Default to seconds if no unit
    duration *= 1000;
  }

  return {
    success: true,
    pythonCode: `wait(${Math.round(duration)})`,
    confidence: 0.9,
  };
}

function tryParseMotor(
  tokens: Token[],
  defaults: Defaults,
  _motorNames: string[]
): ParseResult | null {
  const hasRunVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.RUN_VERBS.includes(t.normalized || t.value)
  );
  const hasMotor = tokens.some((t) => t.type === 'motor');

  if (!hasRunVerb || !hasMotor) return null;

  const motorToken = tokens.find((t) => t.type === 'motor');
  const motorName = motorToken?.value || 'motor';

  const number = tokens.find((t) => t.type === 'number');

  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'angle',
        message: `How many degrees should the ${motorName} motor run?`,
        type: 'angle',
      },
      confidence: 0.7,
    };
  }

  const angle = number.numericValue || 0;
  const speed = defaults.motorSpeed;

  return {
    success: true,
    pythonCode: `${motorName}.run_angle(${speed}, ${angle})`,
    confidence: 0.85,
  };
}

function tryParseStop(tokens: Token[], _motorNames: string[]): ParseResult | null {
  const hasStopVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.STOP_VERBS.includes(t.normalized || t.value)
  );

  if (!hasStopVerb) return null;

  const hasMotor = tokens.some((t) => t.type === 'motor');
  const motorToken = tokens.find((t) => t.type === 'motor');

  if (hasMotor && motorToken) {
    return {
      success: true,
      pythonCode: `${motorToken.value}.stop()`,
      confidence: 0.9,
    };
  }

  return {
    success: true,
    pythonCode: `robot.stop()`,
    confidence: 0.85,
  };
}

export { tokenize } from './tokenizer';
