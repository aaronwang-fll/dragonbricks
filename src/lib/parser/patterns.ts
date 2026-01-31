export const MOVE_VERBS = ['move', 'go', 'drive', 'travel'];
export const FORWARD_WORDS = ['forward', 'forwards', 'ahead', 'straight'];
export const BACKWARD_WORDS = ['backward', 'backwards', 'back', 'reverse'];
export const TURN_VERBS = ['turn', 'rotate', 'spin', 'pivot'];
export const LEFT_WORDS = ['left'];
export const RIGHT_WORDS = ['right'];
export const WAIT_VERBS = ['wait', 'pause', 'delay', 'sleep'];
export const RUN_VERBS = ['run', 'spin', 'rotate', 'move'];
export const STOP_VERBS = ['stop', 'halt', 'brake'];
export const SET_VERBS = ['set', 'change', 'configure', 'adjust', 'use'];
export const MOTOR_WORDS = ['motor', 'arm', 'claw', 'gripper', 'lift'];

export const UNIT_CONVERSIONS: Record<string, number> = {
  'mm': 1,
  'millimeter': 1,
  'millimeters': 1,
  'millimetre': 1,
  'millimetres': 1,
  'cm': 10,
  'centimeter': 10,
  'centimeters': 10,
  'centimetre': 10,
  'centimetres': 10,
  'm': 1000,
  'meter': 1000,
  'meters': 1000,
  'metre': 1000,
  'metres': 1000,
};

export const TIME_CONVERSIONS: Record<string, number> = {
  'ms': 1,
  'millisecond': 1,
  'milliseconds': 1,
  's': 1000,
  'sec': 1000,
  'second': 1000,
  'seconds': 1000,
  'min': 60000,
  'minute': 60000,
  'minutes': 60000,
};

export const ANGLE_UNITS = ['degree', 'degrees', 'deg', '°'];

export const COLORS = ['red', 'green', 'blue', 'yellow', 'white', 'black', 'orange', 'purple'];

// Speed-related words
export const SPEED_WORDS = ['speed', 'velocity', 'rate', 'fast', 'slow', 'quickly', 'slowly'];
export const SPEED_PREPOSITIONS = ['at', 'with', 'using'];
