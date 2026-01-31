# DragonBricks Design Document

**Date:** 2026-01-31
**Status:** Approved
**Version:** 1.0

## Overview

DragonBricks is a natural language interface for programming LEGO SPIKE Prime robots using Pybricks. Users type plain English commands like "move forward 100mm" and the system converts them to Python code that runs on the robot.

### Target Users
- Students on robotics teams (primary)
- New coders
- Experienced programmers
- Coaches and educators

### Core Value Proposition
Efficient coding through natural language - accessible enough for beginners, fast enough for experienced users.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    DRAGONBRICKS WEB APP                  │
│                        (React)                           │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Setup     │  │    Main     │  │    Preview      │   │
│  │   Section   │  │   Section   │  │    Panel        │   │
│  │             │  │             │  │                 │   │
│  │ Robot       │  │ Natural     │  │ 2D field map    │   │
│  │ Profiles    │  │ Language    │  │ + robot path    │   │
│  │ + Ports     │  │ Input       │  │                 │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────────────────┐  │
│  │  Rule-Based Parser  │  │   Cloud AI (fallback)     │  │
│  │  (80% of commands)  │→ │   (complex commands)      │  │
│  └─────────────────────┘  └───────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  Web Bluetooth → SPIKE Prime Hub                         │
└──────────────────────────────────────────────────────────┘
```

**Platform:** Web-first (React), Electron desktop wrapper later

---

## User Interface

### Main Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  DragonBricks     [▶ Run] [⏸ Pause] [⏹ Stop]                        [Settings] [👤]     │
├─────────┬──────────────────────────────────────────────────────────┬─────────────────────┤
│ FILES   │ SETUP SECTION                                            │ PREVIEW             │
│         │                                                          │ (hidden by default, │
│ 📄 Main │ [✓] Use Robot Profile  [Main ▼]                          │  drag to expand)    │
│ 📄 M1   │                                                          │                     │
│ 📄 M2   │ OR:  Left: [A]  Right: [B]  Color: [C]  Dist: [D]        │ ┌─────────────────┐ │
│ 📄 M3   │                                                          │ │ [FLL Field Map] │ │
│         │- - - - - - - - - - - - - - ↕ drag - - - - - - - - - - - -│ │   ●→→→┐        │ │
│ + New   │ MAIN SECTION                                             │ │       ↓        │ │
│         │                                                          │ │       ●        │ │
│         │ move forward 200mm                                   [▼] │ └─────────────────┘ │
│         │   robot.straight(200)                                    │ [▶ Play] [Load Map] │
│         │                                                          │                     │
│         │ turn right 90 degrees                                [▶] │ ⏱️ Est: 12.4 sec   │
│         │                                                          │                     │
│         │ grab mission model                                   [▼] │                     │
│         │   arm.run_angle(200, 90, wait=True)                      │                     │
│         │   wait(500)                                              │                     │
│         │   arm.run_angle(200, -90, wait=True)                     │                     │
│         │                                                          │                     │
│         │- - - - - - - - - - - - - - ↕ drag - - - - - - - - - - - -│                     │
│         │ ▼ Defined Routines (2)                                   │                     │
│         │   grab mission model (height):                       [▼] │                     │
│         │     run arm motor for [height] degrees                   │                     │
│         │     ...                                                  │                     │
│         │                                                          │                     │
│         │ [Expand Python]                                          │                     │
├─────────┴──────────────────────────────────────────────────────────┴─────────────────────┤
│ Status: Ready                                                        🔗 Hub Connected   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key UI Elements

- **Left sidebar:** File list to switch between programs
- **Setup section (30%):** Toggle between robot profile dropdown or manual port table
- **Main section (70%):** Single text box for natural language commands
- **Defined routines:** Collapsible section for custom routines
- **Right sidebar:** Hidden by default, drag to expand, contains Preview panel
- **Code expansion:** `[▶]` on each line expands to show Python
- **Drag resizers:** Between setup/main and main/routines sections

---

## Natural Language Processing

### Two-Tier System

```
User Input → Rule-Based Parser → Match found?
                                    ↓ Yes: Generate Python
                                    ↓ No: Send to Cloud AI
```

### Rule-Based Parser (~80% of commands)

| Natural Language | Python Output |
|-----------------|---------------|
| `move forward 200mm` | `robot.straight(200)` |
| `turn right 90 degrees` | `robot.turn(90)` |
| `turn left 45 degrees` | `robot.turn(-45)` |
| `run arm motor for 360 degrees` | `arm.run_angle(200, 360)` |
| `wait 500ms` | `wait(500)` |
| `set light to red` | `hub.light.on(Color.RED)` |
| `show "Hi" on display` | `hub.display.text("Hi")` |
| `wait until color sensor sees blue` | `while color.color() != Color.BLUE: wait(10)` |

### Fuzzy Matching (Loose - Levenshtein ≤ 3)

| User types | Still matches | How |
|------------|---------------|-----|
| `move forwrad 200mm` | ✓ | Typo tolerance |
| `go forward 200mm` | ✓ | Synonyms (move/go/drive) |
| `move forwards 200` | ✓ | Variations (forward/forwards) |
| `move 200mm forward` | ✓ | Flexible word order |
| `drve ahed 200 mm` | ✓ | Multiple tolerances stacked |

If confidence drops below ~70% after stacking tolerances → passes to Cloud AI.

### Cloud AI Handles
- Complex/ambiguous commands ("wiggle back and forth")
- Multi-step commands in one sentence
- Context-dependent interpretation
- Commands the rule-based parser doesn't recognize

### Input Flexibility
Accepts any format - AI handles combining:
- Single commands
- Multi-line scripts
- Comma-separated commands
- Natural sentences ("move forward 200mm, then turn right 90 degrees")

### Autocomplete
- Inline ghost text suggestions
- ↑↓ arrows cycle through alternatives
- Tab or → to accept

---

## Defaults & Clarification

### Configurable Defaults

| Parameter | Default Value |
|-----------|---------------|
| Speed | 200 mm/sec |
| Acceleration | 700 mm/sec² |
| Turn rate | 150 °/sec |
| Turn acceleration | 300 °/sec² |
| Stop behavior | Stop.HOLD |
| Wheel diameter | 56 mm |
| Axle track | 112 mm |
| Motor speed | 200 °/sec |
| Line threshold | 50 |

### Always Requires Clarification (NO defaults)

- **Distance** (move commands)
- **Turn angle**
- **Wait duration**

### Clarification UI

```
┌─────────────────────────────────────────────────────────┐
│ move forward                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ How far should the robot move?                   │ │
│ │                                                     │ │
│ │ [____] mm    or type "default" to use last value    │ │
│ │                                                     │ │
│ │ [Apply]  [Cancel]                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Robot Profiles

### Profile Template

```
┌─────────────────────────────────────────────────────────────────┐
│ Edit Profile: Main                                              │
├─────────────────────────────────────────────────────────────────┤
│ Profile Name: [Main_______________]                             │
│                                                                 │
│ DRIVE MOTORS                                                    │
│   Left Motor:      [A ▼]  Direction: [Counterclockwise ▼]       │
│   Right Motor:     [B ▼]  Direction: [Clockwise ▼]              │
│                                                                 │
│ WHEEL SETTINGS                                                  │
│   Wheel Diameter:  [56__] mm                                    │
│   Axle Track:      [112_] mm                                    │
│                                                                 │
│ SENSORS                                                         │
│   Color Sensor:    [C ▼]                                        │
│   Ultrasonic:      [D ▼]                                        │
│                                                                 │
│ OTHER MOTORS                                                    │
│   Name: [arm_______]  Port: [E ▼]  Direction: [Clockwise ▼]     │
│   [+ Add Motor]                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Save]  [Delete Profile]  [Set as Default]                      │
└─────────────────────────────────────────────────────────────────┘
```

### Profile Features
- Multiple profiles supported (Main, Competition, Test, etc.)
- One profile set as default
- All fields required - port letter (A-F) or "None"
- Named motors referenced in commands: "run arm motor for 90 degrees"
- Exit confirmation for unsaved changes
- Auto-save every 3 minutes while editing

### Generated Setup Code

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor
from pybricks.parameters import Port, Direction, Stop, Color
from pybricks.robotics import DriveBase
from pybricks.tools import wait

hub = PrimeHub()
left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)
robot = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=112)
color = ColorSensor(Port.C)
ultrasonic = UltrasonicSensor(Port.D)
arm = Motor(Port.E)
```

---

## Custom Routines

### Definition Syntax

```
Define "grab at height" with height:
  run arm motor for [height] degrees
  wait 500ms
  run arm motor for -[height] degrees

Usage:
  grab at height 90
  grab at height 45
```

### Features
- Full custom routine support
- Parameters supported
- Routines shown in collapsible section
- Each routine expandable to show Python

---

## Supported Commands

### Movement
- Move forward/backward [distance]
- Turn left/right [angle]
- Drive in arc/curve [radius, angle]
- Spin in place

### Motor Control
- Run motor [name] at [speed]
- Run motor [name] for [degrees/rotations/seconds]
- Stop motor [name]
- Hold motor [name]

### Sensors
- Wait until color sensor sees [color]
- Wait until distance sensor reads less/more than [value]
- If color is [color] then...
- Follow line until...

### Hub Display
- Show text/number on display
- Show icon/image on display
- Clear display
- Set pixel at [x, y]

### Hub Lights
- Set light to [color]
- Blink light [color]
- Turn light off

### Speaker
- Play beep/tone at [frequency]
- Play note [note] for [duration]
- Set volume to [level]

### Flow Control
- Wait [duration]
- Repeat [n] times
- Loop forever
- If/then/else

---

## Error Handling

### Error Display

```
┌──────────────────────────────────────────────────────────────────┐
│ ❌ Motor on Port A isn't responding                              │
│                                                                  │
│ Check that the motor cable is firmly connected to Port A         │
│ on the hub.                                                      │
│                                                                  │
│ [▶ Show Python error]                                            │
│   OSError: Device not connected to Port.A                        │
│   at line 12: arm.run_angle(200, 90, wait=True)                  │
│                                                                  │
│ 💡 Suggested fix: Change to Port B?                              │
│    [Apply fix]  [Ignore]                                         │
└──────────────────────────────────────────────────────────────────┘
```

### Error Translations

| Python Error | Natural Language |
|--------------|------------------|
| `OSError: Device not connected to Port.A` | Motor on Port A isn't responding |
| `ValueError: speed must be between -1000 and 1000` | Speed value 1500 is too high (max 1000) |
| `RuntimeError: Motor stalled` | Motor is stuck or blocked - check for obstructions |
| `OSError: Sensor not connected` | Color sensor on Port C isn't responding |

### Features
- Translated to natural language
- Expandable to see Python error
- Highlights source command
- Suggests fix with confirmation required

---

## Preview & Simulator

### 2D Path Preview

```
┌─────────────────────────────────────────────────────────────┐
│ 🗺️ Preview                                        [✕ Close] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              [FLL Field Mat Image]                      │ │
│ │    🤖 ─────→─────→─────┐                                │ │
│ │    Start               ↓                                │ │
│ │                   ┌────●  End                           │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [▶ Play]  [⏸ Pause]  [⏮ Reset]     Speed: [1x ▼]          │
│                                                             │
│ ⏱️ Estimated run time: 12.4 seconds                         │
│                                                             │
│ [📁 Load Field Image]  [📍 Set Start Position]              │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Path-only preview. Sensor commands require real robot.   │
└─────────────────────────────────────────────────────────────┘
```

### Features
- Load any image as background (FLL mat, custom field)
- Click to set robot starting position and angle
- Animated playback with speed control (0.5x, 1x, 2x)
- Path drawn based on movement commands
- Estimated run time calculated from speed/acceleration
- Path-only mode - sensors require real robot

---

## Accounts & Storage

### Authentication
- Email/password OR OAuth (Google/Microsoft/GitHub)

### Storage Layers

**Cloud Sync (default):**
- Programs saved to Supabase
- Auto version history (every save = restore point)
- Multi-device access with editing locks

**GitHub Integration (optional):**
- Auto-push every 30 minutes (background)
- Manual "Push to GitHub" button
- Git commits provide additional history

### Multi-Device Editing

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ "FLL Mission 1" is being edited on another device        │
│    (School Laptop)                                          │
│                                                             │
│ [Take editing access]    [View read-only]                   │
└─────────────────────────────────────────────────────────────┘
```

- Configurable cooldown: 1 minute to 1 hour (owner sets)
- File owner can always lock editing to themselves

### Team Sharing

```
┌─────────────────────────────────────────────────────────────┐
│ Share "FLL Mission 1"                                       │
├─────────────────────────────────────────────────────────────┤
│ Shared with:                                                │
│   alex@school.edu          [Can edit ▼]  [Remove]           │
│   jamie@school.edu         [View only ▼] [Remove]           │
│                                                             │
│ [+ Add teammate by email]                                   │
└─────────────────────────────────────────────────────────────┘
```

- Same single-editor lock applies to team members
- Owner priority override always available

---

## Keyboard Shortcuts

### Default Shortcuts

| Action | Shortcut |
|--------|----------|
| Run on robot | Ctrl+Enter |
| Stop program | Ctrl+Shift+Q |
| Save | Ctrl+S |
| Expand all Python | Ctrl+E |
| Toggle preview | Ctrl+P |
| New file | Ctrl+N |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |

### Custom Shortcuts
- Settings page to remap any shortcut
- Natural language: type "shortcut: Ctrl+M = run mission 1"
- AI suggests shortcut after 10 uses of same action

---

## Accessibility

| Feature | Description |
|---------|-------------|
| Keyboard navigation | Full tab/arrow navigation |
| Screen reader | ARIA labels throughout |
| Resizable text | Ctrl+/- or settings slider |
| High contrast mode | Toggle in settings |
| Dyslexia-friendly font | OpenDyslexic option |
| Reduced motion | Disables animations |
| Focus indicators | Visible focus rings |

---

## Offline Support

### Offline Queue

```
┌─────────────────────────────────────────────────────────────┐
│ 📴 Offline Mode                                             │
├─────────────────────────────────────────────────────────────┤
│ You can continue working. Changes will sync when online.    │
│                                                             │
│ Queued actions:                                             │
│   • Save "FLL Mission 1" - modified 2 min ago               │
│   • AI request pending: "wiggle back and forth"             │
└─────────────────────────────────────────────────────────────┘
```

### What Works Offline
- Rule-based commands (80% of usage)
- Editing and saving locally
- Running code on robot (Web Bluetooth is local)
- Preview/simulator

### Unrecognized Commands Offline

```
│ ⚠️ Unable to recognize command (offline)                    │
│                                                             │
│ This command needs AI to interpret. Options:                │
│ • Rewrite using simpler commands                            │
│ • Wait until online to process                              │
│                                                             │
│ [Queue for later]  [Delete command]                         │
```

---

## AI Clean-Up Feature

```
│ move forwrad                                                │
│ trn right                                                   │
│                                                             │
│ [✨ Clean up]                                                │
```

After clicking:

```
│ ✨ Cleaned up 2 commands:                                   │
│   • Fixed typo: "forwrad" → "forward"                       │
│   • Fixed typo: "trn" → "turn"                              │
│   • Added default parameters (speed)                        │
│                                                             │
│ [Accept]  [Undo]                                            │
```

**Note:** Clean-up adds explicit speed/acceleration defaults but still prompts for distance/angle if missing.

---

## Onboarding

### Interactive Tutorial (5 steps)
1. Type first command
2. Expand to see Python
3. Set up robot profile
4. Connect to hub
5. Run on robot (or simulate)

### Tooltip Tour
- Highlights UI elements with explanations
- 8 tooltips covering main features
- Can be replayed from Help menu

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React |
| Styling | Tailwind CSS |
| State management | Zustand or Redux |
| Database / Auth | Supabase |
| Cloud AI | OpenAI / Anthropic API |
| Robot connection | Web Bluetooth API |
| Offline storage | IndexedDB |
| Desktop (later) | Electron wrapper |

### Key Dependencies
- `@anthropic-ai/sdk` or `openai` - AI processing
- `supabase-js` - Database & auth
- `idb` - IndexedDB wrapper for offline
- `levenshtein` - Fuzzy text matching

---

## Version 1.0 Features (All)

- [x] Natural language → Python conversion
- [x] Rule-based + AI hybrid parsing
- [x] Robot profiles / setup
- [x] Web Bluetooth connection
- [x] Cloud sync + accounts (Supabase)
- [x] Team sharing with editing locks
- [x] GitHub integration (optional)
- [x] 2D path preview with estimated time
- [x] Custom routines with parameters
- [x] Autocomplete suggestions
- [x] Error translation + fix suggestions
- [x] Comprehensive accessibility
- [x] Offline queue
- [x] Version history
- [x] Interactive tutorial + tooltip tour
- [x] AI clean-up feature
- [x] Customizable keyboard shortcuts

---

## Next Steps

1. Set up React project with Supabase
2. Implement rule-based parser
3. Build UI layout
4. Add Web Bluetooth connection
5. Integrate Cloud AI for complex commands
6. Build preview/simulator
7. Add collaboration features
8. Testing and polish
