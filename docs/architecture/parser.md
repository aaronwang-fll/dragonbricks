# Parser Architecture

The parser is DragonBricks' core engine — it converts natural language commands into Pybricks Python code. Located in `backend/app/services/parser/`.

## Pipeline

```
Input: "move forward 200mm"
         │
         ▼
┌─────────────────┐
│  tokenizer.py   │  Split into tokens: [move, forward, 200, mm]
└────────┬────────┘
         ▼
┌─────────────────┐
│  patterns.py    │  Match against known command patterns
└────────┬────────┘
         ▼
┌─────────────────┐
│  parser.py      │  Build structured ParseResult with parameters
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 matched?  no match
    │         │
    ▼         ▼
┌────────┐ ┌────────────┐
│codegen │ │ needs_llm  │  Flag for Cloud AI fallback
│  .py   │ │ = True     │
└────┬───┘ └────────────┘
     ▼
Output: "drive.straight(200)"
```

## Modules

### tokenizer.py — Lexical Analysis

Breaks input text into typed tokens.

```python
@dataclass
class Token:
    type: str      # "word", "number", "unit", "operator", "punctuation"
    value: str     # Original text
    normalized: str # Lowercase, stripped

def tokenize(input_str: str) -> List[Token]
```

Token types:
- **word** — alphabetic tokens (`move`, `forward`, `right`)
- **number** — numeric values (`200`, `90`, `1.5`)
- **unit** — measurement units (`mm`, `degrees`, `seconds`, `cm`)
- **operator** — comparison operators (`<`, `>`, `=`)
- **punctuation** — commas, parentheses

### patterns.py — Command Recognition

Defines the vocabulary of recognized commands using synonym maps and pattern structures.

**Synonym maps** normalize variations to canonical forms:
```python
MOVEMENT_SYNONYMS = {
    "forward": ["ahead", "straight", "forwards"],
    "backward": ["back", "backwards", "reverse"],
    ...
}

DIRECTION_SYNONYMS = {
    "right": ["clockwise", "cw"],
    "left": ["counterclockwise", "ccw", "counter-clockwise"],
}
```

**Command patterns** define what each command looks like in natural language:
- Movement: `move forward/backward <distance>`, `turn left/right <angle>`
- Curves: `curve left/right <distance> radius <angle>`
- Motors: `run <motor_name> <angle>`, `run <motor_name> at speed <speed>`
- Waits: `wait <duration>`, `wait until <condition>`
- Sensors: `follow line for <distance>`, `wait until color is <color>`
- Control: `repeat <count> times`, `stop all motors`

### parser.py — Command Processing

The main parsing logic. Takes tokenized input and matches it against patterns.

```python
@dataclass
class ParseResult:
    success: bool
    python_code: Optional[str] = None
    needs_clarification: Optional[ClarificationRequest] = None
    error: Optional[str] = None
    confidence: float = 0.0
    command_type: Optional[str] = None
    needs_llm: bool = False

@dataclass
class RobotConfig:
    left_motor_port: str = "A"
    right_motor_port: str = "B"
    wheel_diameter: float = 56
    axle_track: float = 112
    speed: float = 200
    acceleration: float = 700
    turn_rate: float = 150
    # ... sensor ports, attachment ports

def parse_command(
    input_str: str,
    config: Optional[RobotConfig] = None,
    motor_names: Optional[List[str]] = None,
    routine_names: Optional[List[str]] = None,
) -> ParseResult
```

**Clarification system**: Some commands require values that have no sensible defaults. If "move forward" is typed without a distance, the parser returns:
```python
ParseResult(
    success=False,
    needs_clarification=ClarificationRequest(
        field="distance",
        message="How far should the robot move?",
        type="distance"
    )
)
```

Required clarification fields (no defaults):
- **distance** — for movement commands
- **angle** — for turn commands
- **duration** — for wait commands

### codegen.py — Python Code Generation

Converts parse results into a complete Pybricks Python program.

```python
def generate_program(
    results: List[ParseResult],
    config: RobotConfig,
    routines: Optional[List[dict]] = None,
) -> str
```

Output structure:
```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()

left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)
drive = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=112)
drive.settings(straight_speed=200, straight_acceleration=700,
               turn_rate=150, turn_acceleration=300)

# Generated commands:
drive.straight(200)
drive.turn(90)
wait(1000)
```

### fuzzy_match.py — Typo Tolerance

Uses Levenshtein distance to handle misspellings.

```python
def fuzzy_match(input_word: str, candidates: List[str], max_distance: int = 3) -> Optional[str]
```

- Computes edit distance between input and each candidate
- Returns best match if distance <= `max_distance` (default 3)
- Applied to command verbs, direction words, and unit names
- Example: `"forwrd"` matches `"forward"` (distance 1)

## Supported Commands

| Category | Examples | Pybricks Output |
|----------|----------|-----------------|
| Move | `move forward 200mm` | `drive.straight(200)` |
| Turn | `turn right 90 degrees` | `drive.turn(90)` |
| Curve | `curve left 500mm radius 90 degrees` | `drive.curve(90, 500)` |
| Wait | `wait 1 second` | `wait(1000)` |
| Wait (sensor) | `wait until color is red` | `while color.color() != Color.RED: wait(10)` |
| Motor | `run grabber 180 degrees` | `grabber_motor.run_angle(200, 180)` |
| Motor (speed) | `run arm at speed 200` | `arm_motor.run(200)` |
| Line follow | `follow line for 500mm` | Line-following loop code |
| Repeat | `repeat 3 times` | `for i in range(3):` |
| Stop | `stop all motors` | `drive.stop()` |
| Hub display | `display happy` | `hub.display.icon(Icon.HAPPY)` |
| Speaker | `beep` | `hub.speaker.beep()` |

## Error Handling

When parsing fails, the parser provides structured errors:
- **Unknown command** — no pattern or fuzzy match found
- **Missing parameter** — required field (distance/angle/duration) not provided
- **Invalid value** — parameter out of expected range
- **Ambiguous command** — multiple patterns match with similar confidence

Errors are translated to user-friendly messages by `frontend/src/lib/errors/translate.ts`.
