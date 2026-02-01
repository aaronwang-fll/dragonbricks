// Common Pybricks/Python error patterns and their user-friendly translations
interface ErrorPattern {
  pattern: RegExp;
  message: string;
  suggestion?: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Motor errors
  {
    pattern: /Motor\(Port\.([A-F])\).*not connected/i,
    message: 'Motor on port $1 is not connected',
    suggestion: 'Check that the motor cable is firmly plugged into port $1 on the hub',
  },
  {
    pattern: /OSError: .*ENODEV/i,
    message: 'A device is not connected',
    suggestion: 'Make sure all motors and sensors are properly connected to the hub',
  },

  // Sensor errors
  {
    pattern: /ColorSensor\(Port\.([A-F])\).*not connected/i,
    message: 'Color sensor on port $1 is not connected',
    suggestion: 'Check that the color sensor cable is firmly plugged into port $1',
  },
  {
    pattern: /UltrasonicSensor\(Port\.([A-F])\).*not connected/i,
    message: 'Distance sensor on port $1 is not connected',
    suggestion: 'Check that the ultrasonic sensor cable is firmly plugged into port $1',
  },

  // DriveBase errors
  {
    pattern: /DriveBase.*wheel_diameter.*must be positive/i,
    message: 'Invalid wheel diameter',
    suggestion: 'Wheel diameter must be a positive number (in mm). Common sizes: 56mm, 88mm',
  },
  {
    pattern: /DriveBase.*axle_track.*must be positive/i,
    message: 'Invalid axle track',
    suggestion: 'Axle track (distance between wheels) must be a positive number in mm',
  },

  // Value errors
  {
    pattern: /ValueError: speed must be/i,
    message: 'Speed value is out of range',
    suggestion: 'Try using a speed between 50 and 1000 mm/s',
  },
  {
    pattern: /ValueError: angle must be/i,
    message: 'Angle value is invalid',
    suggestion: 'Angles should be between -360 and 360 degrees',
  },

  // Syntax errors
  {
    pattern: /SyntaxError: invalid syntax/i,
    message: 'There is a syntax error in the generated code',
    suggestion: 'This might be a bug in the parser. Try simplifying your commands.',
  },
  {
    pattern: /IndentationError/i,
    message: 'Code indentation error',
    suggestion: 'This is likely a bug in code generation. Please report this issue.',
  },

  // Name errors
  {
    pattern: /NameError: name '(\w+)' is not defined/i,
    message: "'$1' is not defined",
    suggestion: "Make sure '$1' is set up in your robot profile or defined earlier in the program",
  },

  // Type errors
  {
    pattern: /TypeError: .*expected.*got/i,
    message: 'Wrong type of value provided',
    suggestion: 'Check that you are using numbers for distances and angles, not text',
  },

  // Runtime errors
  {
    pattern: /RuntimeError: program stopped/i,
    message: 'Program was stopped',
    suggestion: 'The program was interrupted. This is normal if you pressed Stop.',
  },
  {
    pattern: /KeyboardInterrupt/i,
    message: 'Program was interrupted',
    suggestion: 'The program was stopped by user request.',
  },

  // Battery/power errors
  {
    pattern: /voltage.*too low/i,
    message: 'Battery voltage is too low',
    suggestion: 'Please charge your SPIKE Prime hub',
  },
  {
    pattern: /overcurrent/i,
    message: 'Motors are drawing too much power',
    suggestion: 'The robot might be stuck or the motors are overloaded. Check for obstructions.',
  },

  // Bluetooth errors
  {
    pattern: /BLE.*disconnect/i,
    message: 'Lost connection to the hub',
    suggestion: 'Move closer to the hub and try reconnecting',
  },
  {
    pattern: /connection.*timeout/i,
    message: 'Connection timed out',
    suggestion: 'Make sure the hub is powered on and try connecting again',
  },
];

export interface TranslatedError {
  originalError: string;
  userMessage: string;
  suggestion?: string;
  isKnownError: boolean;
}

export function translateError(errorMessage: string): TranslatedError {
  for (const errorPattern of ERROR_PATTERNS) {
    const match = errorMessage.match(errorPattern.pattern);
    if (match) {
      // Replace capture groups in the message
      let userMessage = errorPattern.message;
      let suggestion = errorPattern.suggestion;

      for (let i = 1; i < match.length; i++) {
        userMessage = userMessage.replace(`$${i}`, match[i]);
        if (suggestion) {
          suggestion = suggestion.replace(`$${i}`, match[i]);
        }
      }

      return {
        originalError: errorMessage,
        userMessage,
        suggestion,
        isKnownError: true,
      };
    }
  }

  // Unknown error - return a generic message
  return {
    originalError: errorMessage,
    userMessage: 'An error occurred while running your program',
    suggestion: 'Check the error details below for more information',
    isKnownError: false,
  };
}

export function formatErrorForDisplay(error: TranslatedError): string {
  let output = `Error: ${error.userMessage}`;

  if (error.suggestion) {
    output += `\n\nSuggestion: ${error.suggestion}`;
  }

  if (!error.isKnownError) {
    output += `\n\nTechnical details: ${error.originalError}`;
  }

  return output;
}
