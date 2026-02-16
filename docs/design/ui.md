# UI Design

## Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header                                        [Settings]│
├────────┬─────────────────────────────────────────────────┤
│        │                                                 │
│ Side   │  Editor Panel              │  Preview Panel     │
│ bar    │  ┌─────────────────────┐   │                    │
│        │  │ Setup Section       │   │  2D path preview   │
│ [Prog] │  │ (robot config)      │   │  showing robot     │
│ [Prog] │  ├─────────────────────┤   │  movement path     │
│ [Prog] │  │ Main Section        │   │                    │
│        │  │ (natural language    │   │                    │
│ [+New] │  │  commands)           │   │                    │
│        │  │                     │   │                    │
│        │  │ [Python] ← toggle   │   │                    │
│        │  ├─────────────────────┤   │                    │
│        │  │ Routines Section    │   │                    │
│        │  │ (custom routines)   │   │                    │
│        │  └─────────────────────┘   │                    │
├────────┴─────────────────────────────────────────────────┤
│  Status Bar                    [Connection] [Parse Info]  │
└──────────────────────────────────────────────────────────┘
```

## Pages

### Main Page (default)
The primary editing interface with three zones:
- **Sidebar** — Program list with create/switch/delete
- **Editor Panel** — Three resizable sections for robot setup, commands, and routines
- **Preview Panel** — 2D canvas showing the robot's path

### Settings Page
Accessed via Header gear icon. Allows configuring:
- Theme (light/dark)
- Default robot settings
- LLM preferences
- Account management

## Components

### Layout Components

**Header** (`layout/Header.tsx`)
- App logo and title ("DragonBricks")
- Settings gear button
- Theme toggle (dark/light)

**Sidebar** (`layout/Sidebar.tsx`)
- Scrollable program list
- Each program shows name and last-updated time
- "New Program" button at bottom
- Active program highlighted

**StatusBar** (`layout/StatusBar.tsx`)
- Left: connection status (Bluetooth icon + hub name)
- Right: parse status, error count

### Editor Components

**EditorPanel** (`editor/EditorPanel.tsx`)
- Container managing three resizable sections
- Uses `ResizeHandle` components between sections
- Sections can be collapsed/expanded

**SetupSection** (`editor/SetupSection.tsx`)
- Form fields for robot configuration:
  - Motor ports (A-F dropdowns)
  - Wheel diameter, axle track (number inputs)
  - Speed, acceleration defaults
  - Sensor port assignments
  - Named motors (attachment1, attachment2)

**MainSection** (`editor/MainSection.tsx`)
- Textarea for natural language commands (one per line)
- Each line shows parse status icon:
  - Green check — parsed successfully
  - Yellow warning — needs clarification
  - Red X — error
  - Spinner — parsing in progress
- Optional Python panel shows generated code side-by-side
- Inline error/clarification display per line

**PythonPanel** (`editor/PythonPanel.tsx`)
- Collapsible panel showing generated Python code
- Syntax highlighting
- Copy-to-clipboard button
- Resizable width via drag handle

**Autocomplete** (`editor/Autocomplete.tsx`)
- Dropdown suggestions as user types commands
- Shows matching command patterns
- Keyboard navigation (up/down/enter/escape)

**ClarificationDialog** (`editor/ClarificationDialog.tsx`)
- Inline prompt when a command needs more info
- Shows the field name and a helpful message
- Input field with unit suffix (mm, degrees, seconds)
- Submit appends value to the command and re-parses

**ErrorDisplay** (`editor/ErrorDisplay.tsx`)
- Inline error message per command line
- User-friendly error text (translated from parser errors)
- Dismissable

**RoutinesSection** (`editor/RoutinesSection.tsx`)
- List of custom routines (reusable command sequences)
- Each routine has: name, parameters, body (natural language)
- Add/edit/delete routines
- Routines can be called from Main Section by name

### Preview Components

**PreviewPanel** (`preview/PreviewPanel.tsx`)
- HTML5 Canvas for 2D path visualization
- Shows robot start position and movement trail
- Color-coded path segments per command
- Zoom and pan controls
- Optional field image background

### Shared Components

**ResizeHandle** (`shared/ResizeHandle.tsx`)
- Draggable divider between resizable sections
- Horizontal or vertical orientation
- Min/max constraints on section sizes

## Resizable Layout

The editor uses a three-section vertical layout with drag handles:

```
┌──────────────────────┐
│   Setup Section      │ ← height stored in editorStore.setupHeight
├═══════════════════════┤ ← ResizeHandle (drag to resize)
│                      │
│   Main Section       │ ← flex-grow (takes remaining space)
│                      │
├═══════════════════════┤ ← ResizeHandle (drag to resize)
│   Routines Section   │ ← height stored in editorStore.routinesHeight
└──────────────────────┘
```

## Theme System

- **Dark mode** (default): Blue-950 backgrounds, light text
- **Light mode**: Blue-300 backgrounds, dark text
- Toggle via Header button or Settings page
- Persisted to localStorage via themeStore
- Uses Tailwind `dark:` variant classes

## Responsive Behavior

- Desktop-first design (FLL teams typically use laptops/desktops)
- Minimum viable width: ~1024px
- Sidebar collapses on smaller screens
- Preview panel hides on narrow viewports
