# Complete Single-User Experience Design

## Overview

Implement remaining features to complete the single-user DragonBricks experience before adding collaboration features.

## Phase 1: Backend Parser Extensions

### New Command Types

**Sensor Commands:**
```
wait until color is red
wait until distance < 10cm
wait until force pressed
```

Generated code:
```python
while color_sensor.color() != Color.RED:
    wait(10)
```

**Line Following:**
```
follow line until black
follow line for 500mm
follow left edge for 3 seconds
```

**Loop Commands:**
```
repeat 3 times: move forward 100mm, turn right 90
```

**Gyro Turns:**
```
turn right 90 degrees precisely
gyro turn left 45
```

### Implementation

- Add patterns to `patterns.py`: SENSOR_VERBS, LOOP_KEYWORDS, LINE_FOLLOW_VERBS
- Add token types to `tokenizer.py`: sensor, loop, gyro
- Add parser functions: `try_parse_sensor`, `try_parse_line_follow`, `try_parse_loop`, `try_parse_gyro_turn`
- Update `codegen.py` for new command types

## Phase 2: Frontend - Autocomplete

- Wire existing `Autocomplete.tsx` to MainSection
- Trigger on context (after "move", "turn", etc.)
- Keyboard navigation: arrows, Tab/Enter to accept, Escape to close
- Call `/parser/autocomplete` endpoint
- Position popup relative to cursor in textarea

## Phase 3: Frontend - Error Display

- Show inline error indicators next to failed commands
- Display friendly messages with fix suggestions
- Expandable technical details
- Support light/dark mode

## Phase 4: Frontend - Path Preview

### Path Calculation
```typescript
interface PathPoint {
  x: number;
  y: number;
  angle: number;
  commandIndex: number;
}
```

- Start at center (0,0) facing up (0 degrees)
- Update position based on command type
- Store points array for canvas drawing

### Canvas Visualization
- Draw path lines connecting points
- Green dot = start, Blue = current, Red = end
- Direction arrow on robot position
- Timeline scrubber for playback
- Zoom/pan controls

## Phase 5: Frontend - Bluetooth UI

- Connect Hub button in Header
- Connection status indicator (icon + text)
- Battery level display when connected
- Enable/disable Run/Stop based on connection state
- Error messages for connection failures

## Data Flow

1. User types in MainSection
2. Debounced call to `/parser/parse`
3. Backend returns parsed commands + generated code
4. Frontend updates stores
5. PythonPanel shows generated code
6. PreviewPanel calculates and draws path

## State Management

- `editorStore`: commands, generatedCode, UI state
- `connectionStore`: Bluetooth status, hub info
- `previewStore`: path points, playback position, zoom

## Implementation Order

1. Backend parser extensions + tests
2. Frontend autocomplete integration
3. Frontend error display integration
4. Frontend path preview visualization
5. Frontend Bluetooth UI completion
