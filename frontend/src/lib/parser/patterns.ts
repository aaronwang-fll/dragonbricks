// Basic movement
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
export const MOTOR_WORDS = ['motor', 'arm', 'claw', 'gripper', 'lift', 'attachment'];

// Advanced FLL patterns
export const REPEAT_VERBS = ['repeat', 'loop', 'do'];
export const TIMES_WORDS = ['times', 'iterations', 'loops'];
export const DEFINE_VERBS = ['define', 'create', 'make', 'build'];
export const MISSION_WORDS = ['mission', 'routine', 'program', 'task'];
export const CALL_VERBS = ['call', 'execute', 'start', 'begin', 'launch'];

// Sensor patterns
export const SENSOR_WORDS = ['sensor', 'light', 'color', 'distance', 'ultrasonic', 'force', 'gyro'];
export const UNTIL_WORDS = ['until', 'till', 'when'];
export const WHILE_WORDS = ['while', 'during', 'as'];
export const CONDITION_WORDS = ['sees', 'detects', 'reads', 'measures', 'is'];
export const COMPARISON_WORDS = ['greater', 'less', 'more', 'above', 'below', 'equals', 'equal'];
export const THAN_WORDS = ['than'];

// Line following
export const LINE_WORDS = ['line', 'edge', 'border'];
export const FOLLOW_VERBS = ['follow', 'track', 'trace'];

// Parallel execution
export const PARALLEL_WORDS = ['simultaneously', 'together', 'parallel', 'concurrently', 'while'];
export const AND_WORDS = ['and', 'also', 'plus'];

// Precise control
export const PRECISE_WORDS = ['precisely', 'exactly', 'accurate', 'carefully', 'gyro'];
export const QUICK_WORDS = ['quickly', 'fast', 'rapid'];

// Conditional
export const IF_WORDS = ['if', 'when'];
export const THEN_WORDS = ['then'];
export const ELSE_WORDS = ['else', 'otherwise'];

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
