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
  commandType?: 'simple' | 'sensor' | 'loop' | 'parallel' | 'mission' | 'call' | 'line_follow';
  needsLLM?: boolean; // Flag when command is too complex for rule-based parsing
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
  // Order matters: more specific/complex patterns first

  // Advanced FLL patterns first
  const repeatResult = tryParseRepeat(tokens, input);
  if (repeatResult) return repeatResult;

  const sensorWaitResult = tryParseSensorWait(tokens);
  if (sensorWaitResult) return sensorWaitResult;

  const lineFollowResult = tryParseLineFollow(tokens);
  if (lineFollowResult) return lineFollowResult;

  const parallelResult = tryParseParallel(tokens, input);
  if (parallelResult) return parallelResult;

  // Basic patterns
  const stopResult = tryParseStop(tokens, motorNames);
  if (stopResult) return stopResult;

  // Set speed should be checked early - "set speed to 100"
  const setSpeedResult = tryParseSetSpeed(tokens);
  if (setSpeedResult) return setSpeedResult;

  const motorResult = tryParseMotor(tokens, defaults, motorNames);
  if (motorResult) return motorResult;

  // Precise turn (with PI control)
  const preciseTurnResult = tryParsePreciseTurn(tokens, defaults);
  if (preciseTurnResult) return preciseTurnResult;

  // Turn and Move before Wait - they're more common and specific
  const turnResult = tryParseTurn(tokens, defaults);
  if (turnResult) return turnResult;

  const moveResult = tryParseMove(tokens, defaults);
  if (moveResult) return moveResult;

  const waitResult = tryParseWait(tokens);
  if (waitResult) return waitResult;

  // No pattern matched - flag for LLM
  return {
    success: false,
    error: 'Could not parse command',
    confidence: 0,
    needsLLM: true,
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

function tryParseSetSpeed(tokens: Token[]): ParseResult | null {
  // Look for "set speed to X" or "speed X" or "change speed to X"
  const hasSetVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.SET_VERBS.includes(t.normalized || t.value)
  );
  const hasSpeedWord = tokens.some((t) => t.type === 'speed');

  // Must have speed word
  if (!hasSpeedWord) return null;

  // Check if this is a standalone speed command vs "move forward at speed 100"
  // If there's a move verb, this isn't a set speed command
  const hasMoveVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.MOVE_VERBS.includes(t.normalized || t.value)
  );

  if (hasMoveVerb) return null;

  // Check if "turn" is part of "set turn speed" vs a standalone "turn left 90" command
  // If there's a turn verb but also a set verb + speed word, it's a set speed command
  const hasTurnVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.TURN_VERBS.includes(t.normalized || t.value)
  );
  const hasDirection = tokens.some((t) => t.type === 'direction');

  // If there's turn verb + direction (like "turn left 90"), it's a turn command, not set speed
  if (hasTurnVerb && hasDirection && !hasSetVerb) return null;

  // Find the number value
  const number = tokens.find((t) => t.type === 'number');

  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'speed',
        message: 'What speed should be set? (mm/s)',
        type: 'distance', // Using distance type since speed is in mm/s
      },
      confidence: 0.7,
    };
  }

  const speedValue = number.numericValue || 100;

  // Check if this is for turn rate or straight speed
  // Look for "turn" or "turning" or "rotation" in the tokens
  const hasTurnWord = tokens.some(
    (t) => t.value === 'turn' || t.value === 'turning' || t.value === 'rotation'
  );

  if (hasTurnWord) {
    return {
      success: true,
      pythonCode: `robot.settings(turn_rate=${speedValue})`,
      confidence: 0.9,
    };
  }

  return {
    success: true,
    pythonCode: `robot.settings(straight_speed=${speedValue})`,
    confidence: 0.9,
  };
}

// Advanced FLL Patterns

function tryParseRepeat(tokens: Token[], _input: string): ParseResult | null {
  const hasRepeat = tokens.some((t) => t.type === 'repeat');

  if (!hasRepeat) return null;

  const number = tokens.find((t) => t.type === 'number');

  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'count',
        message: 'How many times should the action repeat?',
        type: 'distance', // Reusing distance type for numeric input
      },
      confidence: 0.7,
      commandType: 'loop',
    };
  }

  const count = number.numericValue || 1;

  // Find the action after "times" or ":"
  const timesIndex = tokens.findIndex((t) => t.type === 'times');
  const colonIndex = tokens.findIndex((t) => t.value === ':');
  const actionStartIndex = Math.max(timesIndex, colonIndex) + 1;

  if (actionStartIndex >= tokens.length || actionStartIndex <= 0) {
    return {
      success: true,
      pythonCode: `for i in range(${count}):\n    # Add commands here\n    pass`,
      confidence: 0.7,
      commandType: 'loop',
    };
  }

  return {
    success: true,
    pythonCode: `for i in range(${count}):`,
    confidence: 0.85,
    commandType: 'loop',
  };
}

function tryParseSensorWait(tokens: Token[]): ParseResult | null {
  const hasUntil = tokens.some((t) => t.type === 'until');
  const hasWhile = tokens.some((t) => t.type === 'while');
  const hasSensor = tokens.some((t) => t.type === 'sensor');
  const hasColor = tokens.some((t) => t.type === 'color');

  if ((!hasUntil && !hasWhile) || (!hasSensor && !hasColor)) return null;

  const sensorToken = tokens.find((t) => t.type === 'sensor');
  const colorToken = tokens.find((t) => t.type === 'color');
  const comparisonToken = tokens.find((t) => t.type === 'comparison');
  const numberToken = tokens.find((t) => t.type === 'number');

  // "wait until color sensor sees black"
  if (colorToken && hasSensor) {
    const sensorName = sensorToken?.normalized || 'color_sensor';
    return {
      success: true,
      pythonCode: `while ${sensorName}.color() != Color.${colorToken.normalized?.toUpperCase()}:\n    wait(10)`,
      confidence: 0.85,
      commandType: 'sensor',
    };
  }

  // "wait until light sensor > 50" or "while reflection < 20"
  if (sensorToken && numberToken) {
    const sensorName = sensorToken.normalized || 'sensor';
    const comparison = comparisonToken?.normalized || '>';
    const value = numberToken.numericValue || 50;

    // Determine sensor method based on type
    let sensorMethod = 'reflection()';
    if (sensorName === 'distance' || sensorName === 'ultrasonic') {
      sensorMethod = 'distance()';
    } else if (sensorName === 'force') {
      sensorMethod = 'force()';
    } else if (sensorName === 'gyro') {
      sensorMethod = 'angle()';
    }

    const condition = hasWhile ? comparison : (comparison === '>' ? '<=' : '>=');

    return {
      success: true,
      pythonCode: `while ${sensorName}.${sensorMethod} ${condition} ${value}:\n    wait(10)`,
      confidence: 0.85,
      commandType: 'sensor',
    };
  }

  return null;
}

function tryParseLineFollow(tokens: Token[]): ParseResult | null {
  const hasFollow = tokens.some((t) => t.type === 'follow');
  const hasLine = tokens.some((t) => t.type === 'line');

  if (!hasFollow || !hasLine) return null;

  const hasUntil = tokens.some((t) => t.type === 'until');
  const numberToken = tokens.find((t) => t.type === 'number');
  const unitToken = tokens.find((t) => t.type === 'unit');

  // Calculate distance if provided
  let distance = 0;
  if (numberToken) {
    distance = numberToken.numericValue || 0;
    if (unitToken) {
      const conversion = patterns.UNIT_CONVERSIONS[unitToken.normalized || unitToken.value];
      if (conversion) {
        distance *= conversion;
      }
    }
  }

  // Basic line follow code
  const lineFollowCode = `# Line following - adjust threshold and speed as needed
threshold = 50
while True:
    error = left_light.reflection() - threshold
    correction = error * 1.0  # Adjust gain as needed
    left.run(200 - correction)
    right.run(200 + correction)
    ${distance > 0 ? `if robot.distance() >= ${distance}:\n        break` : hasUntil ? '# Add stop condition' : ''}
    wait(10)
robot.stop()`;

  return {
    success: true,
    pythonCode: lineFollowCode,
    confidence: 0.75,
    commandType: 'line_follow',
  };
}

function tryParseParallel(tokens: Token[], input: string): ParseResult | null {
  const hasParallel = tokens.some((t) => t.type === 'parallel');
  const hasAnd = input.toLowerCase().includes(' and ');

  if (!hasParallel && !hasAnd) return null;

  // Simple parallel detection - "simultaneously move forward and rotate arm"
  if (hasParallel) {
    return {
      success: true,
      pythonCode: `async def task1():\n    # First action\n    pass\n\nasync def task2():\n    # Second action\n    pass\n\nawait multitask(task1(), task2())`,
      confidence: 0.7,
      commandType: 'parallel',
      needsLLM: true, // Complex parallel needs LLM to parse actions
    };
  }

  return null;
}

function tryParsePreciseTurn(tokens: Token[], _defaults: Defaults): ParseResult | null {
  const hasTurnVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.TURN_VERBS.includes(t.normalized || t.value)
  );
  const hasPrecise = tokens.some((t) => t.type === 'precise');
  const direction = tokens.find((t) => t.type === 'direction');

  if (!hasTurnVerb || !hasPrecise) return null;
  if (direction && !['left', 'right'].includes(direction.normalized || '')) return null;

  const angleToken = tokens.find((t) => t.type === 'number');

  if (!angleToken) {
    return {
      success: false,
      needsClarification: {
        field: 'angle',
        message: 'What angle should the robot turn precisely?',
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

  // Generate PI turn code
  return {
    success: true,
    pythonCode: `# Precise turn using gyro feedback
target_angle = hub.imu.heading() + ${angle}
while abs(hub.imu.heading() - target_angle) > 1:
    error = target_angle - hub.imu.heading()
    speed = max(30, min(200, abs(error) * 2))
    if error > 0:
        left.run(-speed)
        right.run(speed)
    else:
        left.run(speed)
        right.run(-speed)
    wait(10)
robot.stop()`,
    confidence: 0.9,
  };
}

export { tokenize } from './tokenizer';
