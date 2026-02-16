"""
Pattern definitions for natural language command parsing.

Pybricks Reference Documentation:
- Main docs: https://docs.pybricks.com/en/latest/
- GitHub: https://github.com/pybricks/pybricks-micropython
- Color constants: https://docs.pybricks.com/en/latest/parameters/color.html
  Available: RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, MAGENTA, WHITE, GRAY, BLACK, NONE
- DriveBase: https://docs.pybricks.com/en/latest/robotics.html
- ColorSensor: https://docs.pybricks.com/en/latest/pupdevices/colorsensor.html
- Motors: https://docs.pybricks.com/en/latest/pupdevices/motor.html
"""

from typing import Dict, List

# Basic movement
MOVE_VERBS: List[str] = ["move", "go", "drive", "travel", "advance", "proceed"]
FORWARD_WORDS: List[str] = ["forward", "forwards", "ahead", "straight", "front"]
BACKWARD_WORDS: List[str] = ["backward", "backwards", "back", "reverse", "behind"]
TURN_VERBS: List[str] = ["turn", "rotate", "spin", "pivot", "swing"]
LEFT_WORDS: List[str] = ["left", "counterclockwise", "ccw"]
RIGHT_WORDS: List[str] = ["right", "clockwise", "cw"]
WAIT_VERBS: List[str] = ["wait", "pause", "delay", "sleep", "hold"]
RUN_VERBS: List[str] = ["run", "spin", "rotate", "move", "activate", "start"]
STOP_VERBS: List[str] = ["stop", "halt", "brake", "freeze", "end"]
SET_VERBS: List[str] = ["set", "change", "configure", "adjust", "use", "make"]
MOTOR_WORDS: List[str] = [
    "motor",
    "arm",
    "claw",
    "gripper",
    "lift",
    "attachment",
    "grabber",
    "lever",
]

# Arc/curve movement (DriveBase.arc)
ARC_VERBS: List[str] = ["arc", "curve", "sweep", "bend"]
RADIUS_WORDS: List[str] = ["radius", "curve", "arc"]

# Motor control modes (Motor methods)
HOLD_WORDS: List[str] = ["hold", "lock", "maintain", "keep"]
COAST_WORDS: List[str] = ["coast", "free", "release", "let go"]
STALL_WORDS: List[str] = ["stall", "stuck", "blocked", "jammed"]

# Hub features (PrimeHub)
BEEP_VERBS: List[str] = ["beep", "sound", "play", "tone", "buzz"]
DISPLAY_VERBS: List[str] = ["display", "show", "print", "write", "draw"]
LIGHT_VERBS: List[str] = ["light", "led", "illuminate", "glow"]
HUB_WORDS: List[str] = ["hub", "prime", "spike", "brick"]
ON_WORDS: List[str] = ["on", "enable", "activate"]
OFF_WORDS: List[str] = ["off", "disable", "deactivate"]

# IMU/Gyro (hub.imu)
HEADING_WORDS: List[str] = ["heading", "direction", "orientation", "angle", "yaw"]
TILT_WORDS: List[str] = ["tilt", "pitch", "roll", "lean", "incline"]
ACCELERATION_WORDS: List[str] = ["acceleration", "accelerate", "speed up"]
RESET_WORDS: List[str] = ["reset", "zero", "clear", "calibrate"]

# Advanced FLL patterns
REPEAT_VERBS: List[str] = ["repeat", "loop", "do"]
TIMES_WORDS: List[str] = ["times", "iterations", "loops"]
DEFINE_VERBS: List[str] = ["define", "create", "make", "build"]
MISSION_WORDS: List[str] = ["mission", "routine", "program", "task"]
CALL_VERBS: List[str] = ["call", "execute", "start", "begin", "launch"]

# Sensor patterns
SENSOR_WORDS: List[str] = ["sensor", "light", "color", "distance", "ultrasonic", "force", "gyro"]
UNTIL_WORDS: List[str] = ["until", "till", "when"]
WHILE_WORDS: List[str] = ["while", "during", "as"]
CONDITION_WORDS: List[str] = ["sees", "detects", "reads", "measures", "is"]
COMPARISON_WORDS: List[str] = ["greater", "less", "more", "above", "below", "equals", "equal"]
THAN_WORDS: List[str] = ["than"]

# Line following
LINE_WORDS: List[str] = ["line", "edge", "border"]
FOLLOW_VERBS: List[str] = ["follow", "track", "trace"]

# Parallel execution
PARALLEL_WORDS: List[str] = ["simultaneously", "together", "parallel", "concurrently", "while"]
AND_WORDS: List[str] = ["and", "also", "plus"]

# Precise control
PRECISE_WORDS: List[str] = ["precisely", "exactly", "accurate", "carefully", "gyro"]
QUICK_WORDS: List[str] = ["quickly", "fast", "rapid"]

# Conditional
IF_WORDS: List[str] = ["if", "when"]
THEN_WORDS: List[str] = ["then"]
ELSE_WORDS: List[str] = ["else", "otherwise"]

# Unit conversions (to mm)
UNIT_CONVERSIONS: Dict[str, float] = {
    "mm": 1,
    "millimeter": 1,
    "millimeters": 1,
    "millimetre": 1,
    "millimetres": 1,
    "cm": 10,
    "centimeter": 10,
    "centimeters": 10,
    "centimetre": 10,
    "centimetres": 10,
    "m": 1000,
    "meter": 1000,
    "meters": 1000,
    "metre": 1000,
    "metres": 1000,
}

# Time conversions (to ms)
TIME_CONVERSIONS: Dict[str, float] = {
    "ms": 1,
    "millisecond": 1,
    "milliseconds": 1,
    "s": 1000,
    "sec": 1000,
    "second": 1000,
    "seconds": 1000,
    "min": 60000,
    "minute": 60000,
    "minutes": 60000,
}

ANGLE_UNITS: List[str] = ["degree", "degrees", "deg"]

# Pybricks Color constants (https://docs.pybricks.com/en/latest/parameters/color.html)
# Saturated: RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, VIOLET, MAGENTA
# Unsaturated: WHITE, GRAY, BLACK, NONE
COLORS: List[str] = [
    "red",
    "orange",
    "yellow",
    "green",
    "cyan",
    "blue",
    "violet",
    "magenta",
    "white",
    "gray",
    "grey",
    "black",
    "none",
]

# Speed-related words
SPEED_WORDS: List[str] = ["speed", "velocity", "rate", "fast", "slow", "quickly", "slowly"]
SPEED_PREPOSITIONS: List[str] = ["at", "with", "using"]

# Filler words to ignore
FILLER_WORDS: List[str] = [
    "for",
    "to",
    "the",
    "a",
    "an",
    "of",
    "by",
    "at",
    "in",
    "on",
    "and",
    "then",
]

# Words that should NOT be fuzzy matched to verbs
VERB_BLACKLIST: List[str] = ["speed", "slow", "fast", "quick", "rate"]

# All verbs combined
ALL_VERBS: List[str] = (
    MOVE_VERBS
    + TURN_VERBS
    + WAIT_VERBS
    + RUN_VERBS
    + STOP_VERBS
    + SET_VERBS
    + FOLLOW_VERBS
    + CALL_VERBS
)

# All directions combined
ALL_DIRECTIONS: List[str] = FORWARD_WORDS + BACKWARD_WORDS + LEFT_WORDS + RIGHT_WORDS

# All units combined
ALL_UNITS: List[str] = list(UNIT_CONVERSIONS.keys()) + list(TIME_CONVERSIONS.keys()) + ANGLE_UNITS


# Autocomplete templates
COMMAND_TEMPLATES = [
    # Movement (DriveBase)
    {"text": "move forward ", "label": "move forward [distance]", "category": "movement"},
    {"text": "move backward ", "label": "move backward [distance]", "category": "movement"},
    {"text": "turn left ", "label": "turn left [angle]", "category": "turn"},
    {"text": "turn right ", "label": "turn right [angle]", "category": "turn"},
    {"text": "arc left ", "label": "arc left [radius] [angle]", "category": "movement"},
    {"text": "arc right ", "label": "arc right [radius] [angle]", "category": "movement"},
    {"text": "drive at ", "label": "drive at [speed] [turn_rate]", "category": "movement"},
    # Timing
    {"text": "wait ", "label": "wait [duration]", "category": "wait"},
    {"text": "wait until ", "label": "wait until [condition]", "category": "sensor"},
    # Motors
    {"text": "run ", "label": "run [motor] [angle]", "category": "motor"},
    {"text": "run motor for ", "label": "run motor for [time]", "category": "motor"},
    {"text": "run motor until stalled", "label": "run until stalled", "category": "motor"},
    {"text": "hold motor", "label": "hold motor position", "category": "motor"},
    # Control
    {"text": "stop", "label": "stop robot", "category": "control"},
    {"text": "brake", "label": "brake robot", "category": "control"},
    {"text": "set speed to ", "label": "set speed to [value]", "category": "control"},
    {"text": "repeat ", "label": "repeat [n] times: [action]", "category": "control"},
    # Sensors
    {"text": "follow line ", "label": "follow line [condition]", "category": "sensor"},
    {"text": "wait until color is ", "label": "wait until color is [color]", "category": "sensor"},
    {"text": "wait until distance < ", "label": "wait until distance < [mm]", "category": "sensor"},
    {"text": "move until ", "label": "move until [condition]", "category": "sensor"},
    # Precise control
    {"text": "turn left precisely ", "label": "turn precisely [angle]", "category": "turn"},
    {"text": "turn right precisely ", "label": "turn precisely [angle]", "category": "turn"},
    # Hub features
    {"text": "beep", "label": "beep [frequency] [duration]", "category": "hub"},
    {"text": "display ", "label": "display [text/image]", "category": "hub"},
    {"text": "reset heading", "label": "reset gyro heading", "category": "hub"},
    {"text": "hub light on ", "label": "hub light on [color]", "category": "hub"},
    {"text": "hub light off", "label": "turn hub light off", "category": "hub"},
    {"text": "light on ", "label": "light on [color]", "category": "hub"},
    {"text": "light off", "label": "turn light off", "category": "hub"},
]

DISTANCE_COMPLETIONS = [
    {"text": "50mm", "label": "50mm"},
    {"text": "100mm", "label": "100mm"},
    {"text": "200mm", "label": "200mm"},
    {"text": "300mm", "label": "300mm"},
    {"text": "500mm", "label": "500mm"},
    {"text": "10cm", "label": "10cm"},
    {"text": "20cm", "label": "20cm"},
    {"text": "50cm", "label": "50cm"},
    {"text": "1m", "label": "1m"},
]

ANGLE_COMPLETIONS = [
    {"text": "15 degrees", "label": "15 degrees"},
    {"text": "30 degrees", "label": "30 degrees"},
    {"text": "45 degrees", "label": "45 degrees"},
    {"text": "90 degrees", "label": "90 degrees"},
    {"text": "180 degrees", "label": "180 degrees"},
    {"text": "360 degrees", "label": "360 degrees"},
]

DURATION_COMPLETIONS = [
    {"text": "500ms", "label": "500ms"},
    {"text": "1 second", "label": "1 second"},
    {"text": "2 seconds", "label": "2 seconds"},
    {"text": "3 seconds", "label": "3 seconds"},
    {"text": "5 seconds", "label": "5 seconds"},
]
