# Backend Parser & Code Generation Design

## Overview

Move all business logic from frontend to backend, keeping frontend as a thin UI client.

## Architecture

### Backend handles:
- Natural language parsing (tokenizer, patterns, fuzzy matching)
- Code generation (setup + full program)
- Autocomplete suggestions
- All validation
- LLM fallback for complex commands

### Frontend handles:
- Path calculation for 2D preview (from parsed commands)
- UI components and state
- Bluetooth communication (browser Web Bluetooth API)

## New Backend Endpoints

### POST /api/v1/parser/parse
Main endpoint - parses commands and generates code in one call.

**Request:**
```json
{
  "commands": ["move forward 200mm", "turn left 90 degrees"],
  "config": {
    "leftMotorPort": "A",
    "rightMotorPort": "B",
    "wheelDiameter": 56,
    "axleTrack": 112,
    "speed": 200,
    "turnRate": 150,
    "attachment1Port": "C",
    "colorSensorPort": "D"
  },
  "routines": []
}
```

**Response:**
```json
{
  "results": [
    {
      "original": "move forward 200mm",
      "python_code": "robot.straight(200)",
      "status": "parsed",
      "command_type": "move",
      "confidence": 1.0
    },
    {
      "original": "turn left 90 degrees",
      "python_code": "robot.turn(-90)",
      "status": "parsed",
      "command_type": "turn",
      "confidence": 1.0
    }
  ],
  "generated_code": "from pybricks.hubs import PrimeHub\n...\nrobot.straight(200)\nrobot.turn(-90)",
  "imports": "from pybricks.hubs import PrimeHub\n...",
  "setup": "hub = PrimeHub()\nleft = Motor(Port.A)\n..."
}
```

### POST /api/v1/parser/autocomplete
Returns command suggestions based on partial input.

**Request:**
```json
{
  "text": "move for",
  "cursor_position": 8
}
```

**Response:**
```json
{
  "suggestions": [
    {"text": "move forward ", "label": "move forward [distance]", "category": "movement"},
    {"text": "move forward 100mm", "label": "move forward 100mm", "category": "movement"}
  ]
}
```

### POST /api/v1/parser/validate
Quick validation of a single command.

**Request:**
```json
{
  "command": "move forward"
}
```

**Response:**
```json
{
  "valid": false,
  "needs_clarification": {
    "field": "distance",
    "message": "How far should the robot move?",
    "type": "distance"
  }
}
```

## Schemas

### ParseRequest
```python
class RobotConfig(BaseModel):
    left_motor_port: str = "A"
    right_motor_port: str = "B"
    wheel_diameter: float = 56
    axle_track: float = 112
    speed: float = 200
    turn_rate: float = 150
    attachment1_port: Optional[str] = None
    attachment2_port: Optional[str] = None
    color_sensor_port: Optional[str] = None
    ultrasonic_port: Optional[str] = None
    force_port: Optional[str] = None

class RoutineDefinition(BaseModel):
    name: str
    parameters: List[str]
    body: str

class ParseRequest(BaseModel):
    commands: List[str]
    config: RobotConfig
    routines: List[RoutineDefinition] = []
```

### ParseResponse
```python
class ParsedCommand(BaseModel):
    original: str
    python_code: Optional[str] = None
    status: Literal["parsed", "error", "needs_clarification", "needs_llm"]
    error: Optional[str] = None
    clarification: Optional[ClarificationRequest] = None
    command_type: Optional[str] = None
    confidence: float = 1.0

class ClarificationRequest(BaseModel):
    field: str
    message: str
    type: Literal["distance", "angle", "duration"]

class ParseResponse(BaseModel):
    results: List[ParsedCommand]
    generated_code: str
    imports: str
    setup: str
```

## Frontend Changes

### Remove (move to backend):
- `src/lib/parser/` - all files
- `src/lib/codegen/` - all files
- `src/lib/autocomplete/suggestions.ts`
- `src/lib/ai/` - all files

### Keep:
- `src/lib/preview/pathCalculator.ts`
- `src/lib/api.ts` (add new endpoints)
- `src/lib/bluetooth/`

### New API methods:
```typescript
// api.ts
async parseCommands(commands: string[], config: RobotConfig): Promise<ParseResponse>
async getAutocompleteSuggestions(text: string, cursor: number): Promise<Suggestion[]>
async validateCommand(command: string): Promise<ValidationResult>
```

## Data Flow

```
User types command
       ↓
  Debounce (300ms)
       ↓
  POST /parser/parse
       ↓
Backend: tokenize → parse → generate code
       ↓
  ParseResponse
       ↓
Frontend: display status + pathCalculator for preview
```

## Implementation Phases

### Phase 1: Backend Parser Endpoints
1. Create `backend/app/services/parser/` with ported logic
2. Create `backend/app/api/parser.py` endpoints
3. Create `backend/app/schemas/parser.py`
4. Add tests

### Phase 2: Frontend API Integration
1. Add methods to `api.ts`
2. Update `useParser` hook
3. Update MainSection component
4. Update autocomplete

### Phase 3: Cleanup
1. Remove old frontend parser code
2. Update Settings (remove API key)
3. Update types
4. End-to-end testing
