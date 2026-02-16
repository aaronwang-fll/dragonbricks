# Frontend Architecture

## Component Tree

```
App
├── SettingsPage                  (settings/SettingsPage.tsx)
│
├── Header                        (layout/Header.tsx)
│   └── settings button → navigates to SettingsPage
│
├── Sidebar                       (layout/Sidebar.tsx)
│   └── program list, new program button
│
├── EditorPanel                   (editor/EditorPanel.tsx)
│   ├── SetupSection              (editor/SetupSection.tsx)  ← resizable
│   │   └── robot configuration fields
│   ├── MainSection               (editor/MainSection.tsx)   ← resizable
│   │   ├── PythonPanel           (editor/PythonPanel.tsx)   ← collapsible
│   │   ├── Autocomplete          (editor/Autocomplete.tsx)
│   │   ├── ClarificationDialog   (editor/ClarificationDialog.tsx)
│   │   └── ErrorDisplay          (editor/ErrorDisplay.tsx)
│   ├── RoutinesSection           (editor/RoutinesSection.tsx) ← resizable
│   └── ResizeHandle              (shared/ResizeHandle.tsx)
│
├── PreviewPanel                  (preview/PreviewPanel.tsx)
│   └── 2D path visualization canvas
│
└── StatusBar                     (layout/StatusBar.tsx)
    └── connection status, parse status
```

## State Management (Zustand)

Four stores, each owning a distinct domain:

### editorStore.ts
The primary store. Manages program data and editor UI state.

| State | Type | Purpose |
|-------|------|---------|
| `currentProgram` | `Program \| null` | Active program being edited |
| `programs` | `Program[]` | All programs in memory |
| `commands` | `ParsedCommand[]` | Parsed results per line |
| `defaults` | `Defaults` | Robot configuration defaults |
| `expandedCommands` | `Set<string>` | Which commands show Python code |
| `showRoutines` | `boolean` | Routines section visibility |
| `setupHeight` / `routinesHeight` | `number` | Resizable section heights |
| `showPythonPanel` | `boolean` | Python panel visibility |
| `pythonPanelWidth` | `number` | Python panel width |

### connectionStore.ts
Web Bluetooth connection state for SPIKE Prime.

| State | Type | Purpose |
|-------|------|---------|
| `isConnected` | `boolean` | Hub connection status |
| `hubName` | `string \| null` | Connected hub name |
| `batteryLevel` | `number \| null` | Hub battery percentage |

### previewStore.ts
Path preview visualization state.

| State | Type | Purpose |
|-------|------|---------|
| `pathPoints` | `PathPoint[]` | Calculated robot path |
| `zoom` | `number` | Preview zoom level |
| `offset` | `{x, y}` | Pan offset |

### themeStore.ts
Theme preferences with persistence.

| State | Type | Purpose |
|-------|------|---------|
| `theme` | `'light' \| 'dark'` | Current theme |
| `setTheme` | function | Toggle theme, persists to localStorage |

## Custom Hooks

### useParser.ts
Orchestrates parsing flow between frontend and backend.

- `parseInput(input)` — Splits input by lines, calls `POST /api/v1/parser/parse`, maps responses to `ParsedCommand[]`
- `parseInputSync(input)` — Synchronous wrapper that preserves existing results while triggering async parse
- `resolveClarification(commandId, field, value)` — Appends clarified value to command and re-parses
- `generateFullProgram()` — Returns the full generated Python code from the last parse

### useBluetooth.ts
Web Bluetooth API wrapper for SPIKE Prime hub connection (currently stubbed).

## Libraries

### lib/api.ts
HTTP client for backend communication. Key functions:
- `parseCommands(lines, config, routines)` — POST to parser endpoint
- `login(email, password)` / `register(...)` — Authentication
- `getPrograms()` / `saveProgram(...)` — Program CRUD

### lib/bluetooth/pybricks.ts
Web Bluetooth protocol for SPIKE Prime (connection, program upload).

### lib/preview/pathCalculator.ts
Calculates 2D path points from parsed movement commands for preview visualization.

### lib/errors/translate.ts
Translates parser error codes to user-friendly messages.

## Type Definitions (types/)

Core types used across the frontend:

```typescript
interface Program {
  id: string;
  name: string;
  setupSection: string;
  mainSection: string;
  routines: Routine[];
  createdAt: Date;
  updatedAt: Date;
  profileId: string | null;
}

interface ParsedCommand {
  id: string;
  naturalLanguage: string;
  pythonCode: string | null;
  status: 'parsed' | 'pending' | 'needs-clarification' | 'error';
  clarification?: { field: string; message: string };
  error?: string;
}

interface Defaults {
  leftMotorPort: string;
  rightMotorPort: string;
  wheelDiameter: number;
  axleTrack: number;
  speed: number;
  acceleration: number;
  turnRate: number;
  turnAcceleration: number;
  motorSpeed: number;
  // sensor and attachment ports...
}
```

## Styling

- Tailwind CSS 4.1 with utility classes
- Dark mode via `dark:` prefix classes
- Default theme: dark (set in themeStore)
- Color scheme: blue-based (`bg-blue-300` light / `bg-blue-950` dark)
