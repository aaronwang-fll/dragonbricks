export interface Suggestion {
  text: string;
  displayText: string;
  description: string;
  category: 'movement' | 'turn' | 'wait' | 'motor' | 'control';
}

// Command templates for autocomplete
const COMMAND_TEMPLATES: Suggestion[] = [
  // Movement
  {
    text: 'move forward ',
    displayText: 'move forward [distance]',
    description: 'Move the robot forward',
    category: 'movement',
  },
  {
    text: 'move backward ',
    displayText: 'move backward [distance]',
    description: 'Move the robot backward',
    category: 'movement',
  },
  {
    text: 'go forward ',
    displayText: 'go forward [distance]',
    description: 'Move forward (alias)',
    category: 'movement',
  },
  {
    text: 'drive straight ',
    displayText: 'drive straight [distance]',
    description: 'Drive in a straight line',
    category: 'movement',
  },

  // Turns
  {
    text: 'turn right ',
    displayText: 'turn right [angle]',
    description: 'Turn the robot right',
    category: 'turn',
  },
  {
    text: 'turn left ',
    displayText: 'turn left [angle]',
    description: 'Turn the robot left',
    category: 'turn',
  },
  {
    text: 'rotate right ',
    displayText: 'rotate right [angle]',
    description: 'Rotate in place (alias)',
    category: 'turn',
  },
  {
    text: 'rotate left ',
    displayText: 'rotate left [angle]',
    description: 'Rotate in place (alias)',
    category: 'turn',
  },
  {
    text: 'spin ',
    displayText: 'spin [direction] [angle]',
    description: 'Spin the robot',
    category: 'turn',
  },

  // Wait
  {
    text: 'wait ',
    displayText: 'wait [duration]',
    description: 'Pause execution',
    category: 'wait',
  },
  {
    text: 'pause ',
    displayText: 'pause [duration]',
    description: 'Pause execution (alias)',
    category: 'wait',
  },
  {
    text: 'delay ',
    displayText: 'delay [duration]',
    description: 'Delay execution (alias)',
    category: 'wait',
  },

  // Motor
  {
    text: 'run arm motor ',
    displayText: 'run arm motor [degrees]',
    description: 'Run the arm motor',
    category: 'motor',
  },
  {
    text: 'run claw motor ',
    displayText: 'run claw motor [degrees]',
    description: 'Run the claw motor',
    category: 'motor',
  },
  {
    text: 'run lift motor ',
    displayText: 'run lift motor [degrees]',
    description: 'Run the lift motor',
    category: 'motor',
  },

  // Control
  {
    text: 'stop',
    displayText: 'stop',
    description: 'Stop all motors',
    category: 'control',
  },
  {
    text: 'stop arm motor',
    displayText: 'stop arm motor',
    description: 'Stop the arm motor',
    category: 'control',
  },
  {
    text: 'halt',
    displayText: 'halt',
    description: 'Stop all motors (alias)',
    category: 'control',
  },
  {
    text: 'brake',
    displayText: 'brake',
    description: 'Stop with braking (alias)',
    category: 'control',
  },
];

// Common distance values
const DISTANCE_COMPLETIONS = [
  '50mm',
  '100mm',
  '150mm',
  '200mm',
  '300mm',
  '500mm',
  '10cm',
  '20cm',
  '50cm',
  '1m',
];

// Common angle values
const ANGLE_COMPLETIONS = [
  '45 degrees',
  '90 degrees',
  '180 degrees',
  '360 degrees',
  '15 degrees',
  '30 degrees',
];

// Common duration values
const DURATION_COMPLETIONS = [
  '500ms',
  '1 second',
  '2 seconds',
  '5 seconds',
  '0.5 seconds',
];

export function getSuggestions(input: string, cursorPosition: number): Suggestion[] {
  const textBeforeCursor = input.slice(0, cursorPosition).toLowerCase();
  const currentLine = textBeforeCursor.split('\n').pop() || '';
  const trimmedLine = currentLine.trim();

  // Empty line - show all command templates
  if (trimmedLine === '') {
    return COMMAND_TEMPLATES.slice(0, 6); // Show first 6 suggestions
  }

  // Check if we're completing a distance
  if (isAskingForDistance(trimmedLine)) {
    return DISTANCE_COMPLETIONS.map(dist => ({
      text: dist,
      displayText: dist,
      description: 'Distance',
      category: 'movement' as const,
    }));
  }

  // Check if we're completing an angle
  if (isAskingForAngle(trimmedLine)) {
    return ANGLE_COMPLETIONS.map(angle => ({
      text: angle,
      displayText: angle,
      description: 'Angle',
      category: 'turn' as const,
    }));
  }

  // Check if we're completing a duration
  if (isAskingForDuration(trimmedLine)) {
    return DURATION_COMPLETIONS.map(dur => ({
      text: dur,
      displayText: dur,
      description: 'Duration',
      category: 'wait' as const,
    }));
  }

  // Filter command templates by prefix
  const matchingCommands = COMMAND_TEMPLATES.filter(cmd =>
    cmd.text.toLowerCase().startsWith(trimmedLine) ||
    cmd.displayText.toLowerCase().includes(trimmedLine)
  );

  return matchingCommands.slice(0, 6);
}

function isAskingForDistance(line: string): boolean {
  const distancePatterns = [
    /move forward\s*$/i,
    /move backward\s*$/i,
    /go forward\s*$/i,
    /go backward\s*$/i,
    /drive straight\s*$/i,
    /drive forward\s*$/i,
  ];

  return distancePatterns.some(pattern => pattern.test(line));
}

function isAskingForAngle(line: string): boolean {
  const anglePatterns = [
    /turn right\s*$/i,
    /turn left\s*$/i,
    /rotate right\s*$/i,
    /rotate left\s*$/i,
    /spin right\s*$/i,
    /spin left\s*$/i,
  ];

  return anglePatterns.some(pattern => pattern.test(line));
}

function isAskingForDuration(line: string): boolean {
  const durationPatterns = [
    /wait\s*$/i,
    /pause\s*$/i,
    /delay\s*$/i,
    /sleep\s*$/i,
  ];

  return durationPatterns.some(pattern => pattern.test(line));
}

export function applySuggestion(
  input: string,
  cursorPosition: number,
  suggestion: Suggestion
): { newText: string; newCursorPosition: number } {
  const textBeforeCursor = input.slice(0, cursorPosition);
  const textAfterCursor = input.slice(cursorPosition);

  // Find the start of the current word/line
  const currentLine = textBeforeCursor.split('\n').pop() || '';
  const lineStart = textBeforeCursor.length - currentLine.length;

  // Replace the current line with the suggestion
  const newText = input.slice(0, lineStart) + suggestion.text + textAfterCursor;
  const newCursorPosition = lineStart + suggestion.text.length;

  return { newText, newCursorPosition };
}
