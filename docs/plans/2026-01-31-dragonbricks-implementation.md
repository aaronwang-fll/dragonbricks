# DragonBricks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a natural language interface for programming LEGO SPIKE Prime robots using Pybricks.

**Architecture:** React SPA with Supabase backend. Two-tier NLP (rule-based parser + cloud AI fallback). Web Bluetooth for robot connection. IndexedDB for offline support.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Supabase, Web Bluetooth API, Anthropic/OpenAI API

---

## Phase 1: Project Setup

### Task 1.1: Initialize React Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `index.html`

**Step 1: Create React project with Vite**

Run:
```bash
cd /Users/xiaofengwang/projects/GitHub/dragonbricks
npm create vite@latest . -- --template react-ts
```

Expected: Project scaffolded with React + TypeScript

**Step 2: Install dependencies**

Run:
```bash
npm install
npm install tailwindcss postcss autoprefixer zustand @supabase/supabase-js
npm install -D @types/node
npx tailwindcss init -p
```

Expected: All dependencies installed

**Step 3: Configure Tailwind**

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 4: Add Tailwind directives**

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --sidebar-width: 200px;
  --preview-width: 300px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Step 5: Update App.tsx with basic structure**

Edit `src/App.tsx`:
```tsx
function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="h-12 bg-white border-b flex items-center px-4">
        <h1 className="text-lg font-semibold">DragonBricks</h1>
      </header>
      <main className="flex-1 flex">
        <p className="p-4">DragonBricks - Coming Soon</p>
      </main>
    </div>
  )
}

export default App
```

**Step 6: Run development server**

Run:
```bash
npm run dev
```

Expected: App running at http://localhost:5173

**Step 7: Commit**

Run:
```bash
git init
echo "node_modules\ndist\n.env\n.env.local" > .gitignore
git add .
git commit -m "feat: initialize React project with Vite and Tailwind"
```

---

### Task 1.2: Create Folder Structure

**Files:**
- Create: `src/components/` (directory)
- Create: `src/hooks/` (directory)
- Create: `src/stores/` (directory)
- Create: `src/lib/` (directory)
- Create: `src/types/` (directory)

**Step 1: Create directory structure**

Run:
```bash
mkdir -p src/components/{layout,editor,preview,profile,shared}
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/lib/{parser,bluetooth,ai}
mkdir -p src/types
```

**Step 2: Create type definitions**

Create `src/types/index.ts`:
```typescript
// Robot profile types
export interface RobotProfile {
  id: string;
  name: string;
  isDefault: boolean;
  leftMotor: PortConfig;
  rightMotor: PortConfig;
  wheelDiameter: number;
  axleTrack: number;
  sensors: SensorConfig[];
  extraMotors: MotorConfig[];
}

export interface PortConfig {
  port: Port | null;
  direction: Direction;
}

export interface SensorConfig {
  type: SensorType;
  port: Port | null;
}

export interface MotorConfig {
  name: string;
  port: Port | null;
  direction: Direction;
}

export type Port = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Direction = 'clockwise' | 'counterclockwise';
export type SensorType = 'color' | 'ultrasonic' | 'force' | 'gyro';

// Command types
export interface ParsedCommand {
  id: string;
  naturalLanguage: string;
  pythonCode: string | null;
  status: 'pending' | 'parsed' | 'error' | 'needs-clarification';
  clarification?: ClarificationRequest;
  error?: string;
}

export interface ClarificationRequest {
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
}

// Program types
export interface Program {
  id: string;
  name: string;
  setupSection: string;
  mainSection: string;
  routines: Routine[];
  createdAt: Date;
  updatedAt: Date;
  profileId: string | null;
}

export interface Routine {
  id: string;
  name: string;
  parameters: string[];
  body: string;
}

// Defaults
export interface Defaults {
  speed: number;
  acceleration: number;
  turnRate: number;
  turnAcceleration: number;
  stopBehavior: 'hold' | 'brake' | 'coast';
  wheelDiameter: number;
  axleTrack: number;
  motorSpeed: number;
  lineThreshold: number;
}

export const DEFAULT_VALUES: Defaults = {
  speed: 200,
  acceleration: 700,
  turnRate: 150,
  turnAcceleration: 300,
  stopBehavior: 'hold',
  wheelDiameter: 56,
  axleTrack: 112,
  motorSpeed: 200,
  lineThreshold: 50,
};
```

**Step 3: Commit**

Run:
```bash
git add .
git commit -m "feat: add folder structure and type definitions"
```

---

### Task 1.3: Setup Zustand Store

**Files:**
- Create: `src/stores/editorStore.ts`
- Create: `src/stores/profileStore.ts`
- Create: `src/stores/connectionStore.ts`

**Step 1: Create editor store**

Create `src/stores/editorStore.ts`:
```typescript
import { create } from 'zustand';
import { Program, ParsedCommand, Defaults, DEFAULT_VALUES } from '../types';

interface EditorState {
  // Current program
  currentProgram: Program | null;
  programs: Program[];

  // Parsed commands
  commands: ParsedCommand[];

  // Defaults
  defaults: Defaults;

  // UI state
  expandedCommands: Set<string>;
  showRoutines: boolean;
  setupHeight: number;
  routinesHeight: number;

  // Actions
  setCurrentProgram: (program: Program | null) => void;
  addProgram: (program: Program) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;

  setCommands: (commands: ParsedCommand[]) => void;
  updateCommand: (id: string, updates: Partial<ParsedCommand>) => void;

  toggleCommandExpanded: (id: string) => void;
  expandAllCommands: () => void;
  collapseAllCommands: () => void;

  setSetupHeight: (height: number) => void;
  setRoutinesHeight: (height: number) => void;
  setShowRoutines: (show: boolean) => void;

  updateDefaults: (updates: Partial<Defaults>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentProgram: null,
  programs: [],
  commands: [],
  defaults: DEFAULT_VALUES,
  expandedCommands: new Set(),
  showRoutines: false,
  setupHeight: 150,
  routinesHeight: 200,

  setCurrentProgram: (program) => set({ currentProgram: program }),

  addProgram: (program) => set((state) => ({
    programs: [...state.programs, program],
  })),

  updateProgram: (id, updates) => set((state) => ({
    programs: state.programs.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
    currentProgram:
      state.currentProgram?.id === id
        ? { ...state.currentProgram, ...updates }
        : state.currentProgram,
  })),

  deleteProgram: (id) => set((state) => ({
    programs: state.programs.filter((p) => p.id !== id),
    currentProgram:
      state.currentProgram?.id === id ? null : state.currentProgram,
  })),

  setCommands: (commands) => set({ commands }),

  updateCommand: (id, updates) => set((state) => ({
    commands: state.commands.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  toggleCommandExpanded: (id) => set((state) => {
    const newExpanded = new Set(state.expandedCommands);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    return { expandedCommands: newExpanded };
  }),

  expandAllCommands: () => set((state) => ({
    expandedCommands: new Set(state.commands.map((c) => c.id)),
  })),

  collapseAllCommands: () => set({ expandedCommands: new Set() }),

  setSetupHeight: (height) => set({ setupHeight: height }),
  setRoutinesHeight: (height) => set({ routinesHeight: height }),
  setShowRoutines: (show) => set({ showRoutines: show }),

  updateDefaults: (updates) => set((state) => ({
    defaults: { ...state.defaults, ...updates },
  })),
}));
```

**Step 2: Create profile store**

Create `src/stores/profileStore.ts`:
```typescript
import { create } from 'zustand';
import { RobotProfile } from '../types';

interface ProfileState {
  profiles: RobotProfile[];
  currentProfileId: string | null;
  useProfile: boolean;

  // Actions
  addProfile: (profile: RobotProfile) => void;
  updateProfile: (id: string, updates: Partial<RobotProfile>) => void;
  deleteProfile: (id: string) => void;
  setDefaultProfile: (id: string) => void;
  setCurrentProfileId: (id: string | null) => void;
  setUseProfile: (use: boolean) => void;
  getCurrentProfile: () => RobotProfile | null;
  getDefaultProfile: () => RobotProfile | null;
}

const createDefaultProfile = (): RobotProfile => ({
  id: 'main',
  name: 'Main',
  isDefault: true,
  leftMotor: { port: 'A', direction: 'counterclockwise' },
  rightMotor: { port: 'B', direction: 'clockwise' },
  wheelDiameter: 56,
  axleTrack: 112,
  sensors: [
    { type: 'color', port: 'C' },
    { type: 'ultrasonic', port: 'D' },
  ],
  extraMotors: [],
});

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [createDefaultProfile()],
  currentProfileId: 'main',
  useProfile: true,

  addProfile: (profile) => set((state) => ({
    profiles: [...state.profiles, profile],
  })),

  updateProfile: (id, updates) => set((state) => ({
    profiles: state.profiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
  })),

  deleteProfile: (id) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== id),
    currentProfileId:
      state.currentProfileId === id
        ? state.profiles.find((p) => p.isDefault)?.id ?? null
        : state.currentProfileId,
  })),

  setDefaultProfile: (id) => set((state) => ({
    profiles: state.profiles.map((p) => ({
      ...p,
      isDefault: p.id === id,
    })),
  })),

  setCurrentProfileId: (id) => set({ currentProfileId: id }),
  setUseProfile: (use) => set({ useProfile: use }),

  getCurrentProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.currentProfileId) ?? null;
  },

  getDefaultProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.isDefault) ?? null;
  },
}));
```

**Step 3: Create connection store**

Create `src/stores/connectionStore.ts`:
```typescript
import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type ProgramStatus = 'idle' | 'running' | 'paused' | 'stopped';

interface ConnectionState {
  status: ConnectionStatus;
  programStatus: ProgramStatus;
  device: BluetoothDevice | null;
  error: string | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setProgramStatus: (status: ProgramStatus) => void;
  setDevice: (device: BluetoothDevice | null) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  programStatus: 'idle',
  device: null,
  error: null,

  setStatus: (status) => set({ status }),
  setProgramStatus: (status) => set({ programStatus: status }),
  setDevice: (device) => set({ device }),
  setError: (error) => set({ error }),

  disconnect: () => set({
    status: 'disconnected',
    programStatus: 'idle',
    device: null,
    error: null,
  }),
}));
```

**Step 4: Commit**

Run:
```bash
git add .
git commit -m "feat: add Zustand stores for editor, profile, and connection state"
```

---

## Phase 2: Core UI Layout

### Task 2.1: Create Layout Components

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/StatusBar.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Header component**

Create `src/components/layout/Header.tsx`:
```tsx
import { useConnectionStore } from '../../stores/connectionStore';

export function Header() {
  const { programStatus } = useConnectionStore();

  const handleRun = () => {
    console.log('Run program');
  };

  const handlePause = () => {
    console.log('Pause program');
  };

  const handleStop = () => {
    console.log('Stop program');
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">DragonBricks</h1>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={handleRun}
            disabled={programStatus === 'running'}
            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>▶</span> Run
          </button>
          <button
            onClick={handlePause}
            disabled={programStatus !== 'running'}
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>⏸</span> Pause
          </button>
          <button
            onClick={handleStop}
            disabled={programStatus === 'idle'}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>⏹</span> Stop
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded">
          ⚙️ Settings
        </button>
        <button className="p-2 hover:bg-gray-100 rounded">
          👤 Account
        </button>
      </div>
    </header>
  );
}
```

**Step 2: Create Sidebar component**

Create `src/components/layout/Sidebar.tsx`:
```tsx
import { useEditorStore } from '../../stores/editorStore';
import { Program } from '../../types';

export function Sidebar() {
  const { programs, currentProgram, setCurrentProgram, addProgram } = useEditorStore();

  const handleNewFile = () => {
    const newProgram: Program = {
      id: `program-${Date.now()}`,
      name: `Untitled ${programs.length + 1}`,
      setupSection: '',
      mainSection: '',
      routines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileId: null,
    };
    addProgram(newProgram);
    setCurrentProgram(newProgram);
  };

  return (
    <aside className="w-48 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase">Files</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {programs.map((program) => (
          <button
            key={program.id}
            onClick={() => setCurrentProgram(program)}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
              currentProgram?.id === program.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <span>📄</span>
            {program.name}
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleNewFile}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded flex items-center gap-2"
        >
          <span>+</span> New
        </button>
      </div>
    </aside>
  );
}
```

**Step 3: Create StatusBar component**

Create `src/components/layout/StatusBar.tsx`:
```tsx
import { useConnectionStore } from '../../stores/connectionStore';

export function StatusBar() {
  const { status, error } = useConnectionStore();

  const statusText = {
    disconnected: '⚪ Disconnected',
    connecting: '🟡 Connecting...',
    connected: '🟢 Hub Connected',
    error: '🔴 Connection Error',
  };

  return (
    <footer className="h-6 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
      <span>Status: Ready</span>
      <span>{error || statusText[status]}</span>
    </footer>
  );
}
```

**Step 4: Update App.tsx with layout**

Edit `src/App.tsx`:
```tsx
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex">
          <div className="flex-1 p-4">
            <p className="text-gray-500">Editor coming soon...</p>
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
```

**Step 5: Run and verify**

Run:
```bash
npm run dev
```

Expected: Layout with header, sidebar, main area, and status bar visible

**Step 6: Commit**

Run:
```bash
git add .
git commit -m "feat: add layout components (Header, Sidebar, StatusBar)"
```

---

### Task 2.2: Create Editor Panel with Resizable Sections

**Files:**
- Create: `src/components/editor/EditorPanel.tsx`
- Create: `src/components/editor/SetupSection.tsx`
- Create: `src/components/editor/MainSection.tsx`
- Create: `src/components/editor/RoutinesSection.tsx`
- Create: `src/components/shared/ResizeHandle.tsx`

**Step 1: Create ResizeHandle component**

Create `src/components/shared/ResizeHandle.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos(direction === 'vertical' ? e.clientY : e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const currentPos = direction === 'vertical' ? e.clientY : e.clientX;
      const delta = currentPos - startPos;
      onResize(delta);
      setStartPos(currentPos);
    },
    [isDragging, startPos, direction, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        ${direction === 'vertical' ? 'h-2 cursor-row-resize' : 'w-2 cursor-col-resize'}
        bg-gray-200 hover:bg-blue-300 transition-colors
        flex items-center justify-center
        ${isDragging ? 'bg-blue-400' : ''}
      `}
    >
      <div className={`
        ${direction === 'vertical' ? 'w-8 h-0.5' : 'h-8 w-0.5'}
        bg-gray-400
      `} />
    </div>
  );
}
```

**Step 2: Create SetupSection component**

Create `src/components/editor/SetupSection.tsx`:
```tsx
import { useProfileStore } from '../../stores/profileStore';

export function SetupSection() {
  const { profiles, currentProfileId, useProfile, setCurrentProfileId, setUseProfile } =
    useProfileStore();

  return (
    <div className="p-3 bg-white">
      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useProfile}
            onChange={(e) => setUseProfile(e.target.checked)}
            className="rounded"
          />
          Use Robot Profile
        </label>

        {useProfile && (
          <select
            value={currentProfileId || ''}
            onChange={(e) => setCurrentProfileId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} {profile.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!useProfile && (
        <div className="grid grid-cols-4 gap-2 text-sm">
          <label className="flex items-center gap-1">
            Left: <select className="px-1 py-0.5 border rounded text-xs"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option></select>
          </label>
          <label className="flex items-center gap-1">
            Right: <select className="px-1 py-0.5 border rounded text-xs"><option>B</option><option>A</option><option>C</option><option>D</option><option>E</option><option>F</option></select>
          </label>
          <label className="flex items-center gap-1">
            Color: <select className="px-1 py-0.5 border rounded text-xs"><option>C</option><option>A</option><option>B</option><option>D</option><option>E</option><option>F</option><option>None</option></select>
          </label>
          <label className="flex items-center gap-1">
            Dist: <select className="px-1 py-0.5 border rounded text-xs"><option>D</option><option>A</option><option>B</option><option>C</option><option>E</option><option>F</option><option>None</option></select>
          </label>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create MainSection component**

Create `src/components/editor/MainSection.tsx`:
```tsx
import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

export function MainSection() {
  const [input, setInput] = useState('');
  const { commands, expandedCommands, toggleCommandExpanded } = useEditorStore();

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-3 overflow-y-auto">
        {commands.length === 0 ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type natural language commands here...&#10;&#10;Examples:&#10;  move forward 200mm&#10;  turn right 90 degrees&#10;  wait 1 second"
            className="w-full h-full resize-none border-0 outline-none text-sm font-mono"
          />
        ) : (
          <div className="space-y-1">
            {commands.map((cmd) => (
              <div key={cmd.id} className="group">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCommandExpanded(cmd.id)}
                    className="text-gray-400 hover:text-gray-600 w-4"
                  >
                    {expandedCommands.has(cmd.id) ? '▼' : '▶'}
                  </button>
                  <span className="text-sm font-mono">{cmd.naturalLanguage}</span>
                </div>
                {expandedCommands.has(cmd.id) && cmd.pythonCode && (
                  <pre className="ml-6 mt-1 p-2 bg-gray-50 text-xs text-gray-600 rounded">
                    {cmd.pythonCode}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-between">
        <button className="text-sm text-blue-600 hover:text-blue-800">
          Expand Python
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Create RoutinesSection component**

Create `src/components/editor/RoutinesSection.tsx`:
```tsx
import { useEditorStore } from '../../stores/editorStore';

export function RoutinesSection() {
  const { currentProgram, showRoutines, setShowRoutines } = useEditorStore();
  const routines = currentProgram?.routines || [];

  return (
    <div className="bg-white border-t border-gray-200">
      <button
        onClick={() => setShowRoutines(!showRoutines)}
        className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{showRoutines ? '▼' : '▶'}</span>
        Defined Routines ({routines.length})
      </button>

      {showRoutines && (
        <div className="p-3 pt-0">
          {routines.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No routines defined. Create one by typing "Define [name]:"
            </p>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => (
                <div key={routine.id} className="p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium">{routine.name}</span>
                  {routine.parameters.length > 0 && (
                    <span className="text-gray-500">
                      ({routine.parameters.join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 5: Create EditorPanel component**

Create `src/components/editor/EditorPanel.tsx`:
```tsx
import { useEditorStore } from '../../stores/editorStore';
import { ResizeHandle } from '../shared/ResizeHandle';
import { SetupSection } from './SetupSection';
import { MainSection } from './MainSection';
import { RoutinesSection } from './RoutinesSection';

export function EditorPanel() {
  const { setupHeight, routinesHeight, setSetupHeight, setRoutinesHeight } =
    useEditorStore();

  const handleSetupResize = (delta: number) => {
    setSetupHeight(Math.max(80, Math.min(300, setupHeight + delta)));
  };

  const handleRoutinesResize = (delta: number) => {
    setRoutinesHeight(Math.max(50, Math.min(400, routinesHeight - delta)));
  };

  return (
    <div className="flex-1 flex flex-col border-r border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Setup
      </div>
      <div style={{ height: setupHeight }}>
        <SetupSection />
      </div>

      <ResizeHandle direction="vertical" onResize={handleSetupResize} />

      <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 bg-gray-50 border-b border-gray-200">
        Main
      </div>
      <MainSection />

      <ResizeHandle direction="vertical" onResize={handleRoutinesResize} />

      <div style={{ height: routinesHeight, minHeight: 50 }}>
        <RoutinesSection />
      </div>
    </div>
  );
}
```

**Step 6: Update App.tsx**

Edit `src/App.tsx`:
```tsx
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorPanel } from './components/editor/EditorPanel';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex">
          <EditorPanel />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
```

**Step 7: Run and verify**

Run:
```bash
npm run dev
```

Expected: Editor with resizable setup, main, and routines sections

**Step 8: Commit**

Run:
```bash
git add .
git commit -m "feat: add EditorPanel with resizable sections"
```

---

### Task 2.3: Create Preview Panel (Right Sidebar)

**Files:**
- Create: `src/components/preview/PreviewPanel.tsx`
- Create: `src/stores/previewStore.ts`
- Modify: `src/App.tsx`

**Step 1: Create preview store**

Create `src/stores/previewStore.ts`:
```typescript
import { create } from 'zustand';

interface PathPoint {
  x: number;
  y: number;
  angle: number;
}

interface PreviewState {
  isOpen: boolean;
  width: number;
  fieldImage: string | null;
  robotPath: PathPoint[];
  startPosition: { x: number; y: number; angle: number };
  isPlaying: boolean;
  playbackSpeed: number;
  estimatedTime: number;

  // Actions
  setIsOpen: (open: boolean) => void;
  setWidth: (width: number) => void;
  setFieldImage: (image: string | null) => void;
  setRobotPath: (path: PathPoint[]) => void;
  setStartPosition: (pos: { x: number; y: number; angle: number }) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setEstimatedTime: (time: number) => void;
  reset: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  isOpen: false,
  width: 300,
  fieldImage: null,
  robotPath: [],
  startPosition: { x: 100, y: 100, angle: 0 },
  isPlaying: false,
  playbackSpeed: 1,
  estimatedTime: 0,

  setIsOpen: (open) => set({ isOpen: open }),
  setWidth: (width) => set({ width: Math.max(200, Math.min(600, width)) }),
  setFieldImage: (image) => set({ fieldImage: image }),
  setRobotPath: (path) => set({ robotPath: path }),
  setStartPosition: (pos) => set({ startPosition: pos }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setEstimatedTime: (time) => set({ estimatedTime: time }),
  reset: () => set({
    robotPath: [],
    isPlaying: false,
  }),
}));
```

**Step 2: Create PreviewPanel component**

Create `src/components/preview/PreviewPanel.tsx`:
```tsx
import { useRef } from 'react';
import { usePreviewStore } from '../../stores/previewStore';
import { ResizeHandle } from '../shared/ResizeHandle';

export function PreviewPanel() {
  const {
    isOpen,
    width,
    fieldImage,
    robotPath,
    startPosition,
    isPlaying,
    playbackSpeed,
    estimatedTime,
    setIsOpen,
    setWidth,
    setFieldImage,
    setIsPlaying,
    setPlaybackSpeed,
    reset,
  } = usePreviewStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFieldImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-6 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 flex items-center justify-center"
        title="Open Preview"
      >
        <span className="text-gray-500">◀</span>
      </button>
    );
  }

  return (
    <>
      <ResizeHandle
        direction="horizontal"
        onResize={(delta) => setWidth(width - delta)}
      />
      <aside style={{ width }} className="bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <span className="text-sm font-semibold">Preview</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-2 overflow-hidden">
          <div
            className="w-full h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundImage: fieldImage ? `url(${fieldImage})` : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {!fieldImage && (
              <span className="text-gray-400 text-sm">No field image loaded</span>
            )}

            {/* Robot start position */}
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full"
              style={{
                left: startPosition.x,
                top: startPosition.y,
                transform: `rotate(${startPosition.angle}deg)`,
              }}
            >
              <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-blue-700 -translate-x-1/2 -translate-y-full" />
            </div>

            {/* Path visualization would go here */}
          </div>
        </div>

        <div className="p-2 border-t border-gray-200 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={reset}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
            >
              ⏮ Reset
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-1 py-1 border border-gray-300 rounded text-xs"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <div className="text-xs text-gray-600">
            ⏱️ Estimated time: {estimatedTime.toFixed(1)}s
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleLoadImage}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
            >
              📁 Load Map
            </button>
            <button className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded">
              📍 Set Start
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="p-2 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-700">
          ⚠️ Path-only preview. Sensors require real robot.
        </div>
      </aside>
    </>
  );
}
```

**Step 3: Update App.tsx**

Edit `src/App.tsx`:
```tsx
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex">
          <EditorPanel />
          <PreviewPanel />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
```

**Step 4: Run and verify**

Run:
```bash
npm run dev
```

Expected: Preview panel that can be opened/closed, with field image loading

**Step 5: Commit**

Run:
```bash
git add .
git commit -m "feat: add PreviewPanel with resizable right sidebar"
```

---

## Phase 3: Rule-Based Parser

### Task 3.1: Create Parser Core

**Files:**
- Create: `src/lib/parser/index.ts`
- Create: `src/lib/parser/tokenizer.ts`
- Create: `src/lib/parser/fuzzyMatch.ts`
- Create: `src/lib/parser/patterns.ts`
- Test: `src/lib/parser/__tests__/parser.test.ts`

**Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Step 2: Configure Vitest**

Edit `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 3: Create fuzzy matching utility**

Create `src/lib/parser/fuzzyMatch.ts`:
```typescript
/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two strings are fuzzy matches (Levenshtein distance <= 3)
 */
export function isFuzzyMatch(input: string, target: string, maxDistance = 3): boolean {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();

  if (inputLower === targetLower) return true;

  return levenshteinDistance(inputLower, targetLower) <= maxDistance;
}

/**
 * Find best fuzzy match from a list of options
 */
export function findBestMatch(
  input: string,
  options: string[],
  maxDistance = 3
): { match: string; distance: number } | null {
  const inputLower = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(inputLower, option.toLowerCase());
    if (distance < bestDistance && distance <= maxDistance) {
      bestMatch = option;
      bestDistance = distance;
    }
  }

  return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
}
```

**Step 4: Create patterns/synonyms**

Create `src/lib/parser/patterns.ts`:
```typescript
export const MOVE_VERBS = ['move', 'go', 'drive', 'travel'];
export const FORWARD_WORDS = ['forward', 'forwards', 'ahead', 'straight'];
export const BACKWARD_WORDS = ['backward', 'backwards', 'back', 'reverse'];
export const TURN_VERBS = ['turn', 'rotate', 'spin', 'pivot'];
export const LEFT_WORDS = ['left'];
export const RIGHT_WORDS = ['right'];
export const WAIT_VERBS = ['wait', 'pause', 'delay', 'sleep'];
export const RUN_VERBS = ['run', 'spin', 'rotate', 'move'];
export const STOP_VERBS = ['stop', 'halt', 'brake'];
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
```

**Step 5: Create tokenizer**

Create `src/lib/parser/tokenizer.ts`:
```typescript
import { findBestMatch } from './fuzzyMatch';
import * as patterns from './patterns';

export interface Token {
  type: 'verb' | 'direction' | 'number' | 'unit' | 'color' | 'motor' | 'word' | 'unknown';
  value: string;
  normalized?: string;
  numericValue?: number;
}

const ALL_VERBS = [
  ...patterns.MOVE_VERBS,
  ...patterns.TURN_VERBS,
  ...patterns.WAIT_VERBS,
  ...patterns.RUN_VERBS,
  ...patterns.STOP_VERBS,
];

const ALL_DIRECTIONS = [
  ...patterns.FORWARD_WORDS,
  ...patterns.BACKWARD_WORDS,
  ...patterns.LEFT_WORDS,
  ...patterns.RIGHT_WORDS,
];

const ALL_UNITS = [
  ...Object.keys(patterns.UNIT_CONVERSIONS),
  ...Object.keys(patterns.TIME_CONVERSIONS),
  ...patterns.ANGLE_UNITS,
];

export function tokenize(input: string): Token[] {
  // Split on whitespace and punctuation, keeping numbers with units together
  const words = input
    .toLowerCase()
    .replace(/[,.:;!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens: Token[] = [];

  for (const word of words) {
    // Check for number (possibly with unit attached)
    const numMatch = word.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
    if (numMatch) {
      const [, numStr, unitStr] = numMatch;
      tokens.push({
        type: 'number',
        value: numStr,
        numericValue: parseFloat(numStr),
      });
      if (unitStr) {
        tokens.push(classifyWord(unitStr));
      }
      continue;
    }

    tokens.push(classifyWord(word));
  }

  return tokens;
}

function classifyWord(word: string): Token {
  // Try exact matches first
  if (ALL_VERBS.includes(word)) {
    return { type: 'verb', value: word, normalized: word };
  }

  if (ALL_DIRECTIONS.includes(word)) {
    return { type: 'direction', value: word, normalized: normalizeDirection(word) };
  }

  if (ALL_UNITS.includes(word)) {
    return { type: 'unit', value: word, normalized: word };
  }

  if (patterns.COLORS.includes(word)) {
    return { type: 'color', value: word, normalized: word };
  }

  if (patterns.MOTOR_WORDS.includes(word)) {
    return { type: 'motor', value: word, normalized: word };
  }

  // Try fuzzy matching
  const verbMatch = findBestMatch(word, ALL_VERBS, 3);
  if (verbMatch) {
    return { type: 'verb', value: word, normalized: verbMatch.match };
  }

  const dirMatch = findBestMatch(word, ALL_DIRECTIONS, 3);
  if (dirMatch) {
    return { type: 'direction', value: word, normalized: normalizeDirection(dirMatch.match) };
  }

  const unitMatch = findBestMatch(word, ALL_UNITS, 2);
  if (unitMatch) {
    return { type: 'unit', value: word, normalized: unitMatch.match };
  }

  const colorMatch = findBestMatch(word, patterns.COLORS, 2);
  if (colorMatch) {
    return { type: 'color', value: word, normalized: colorMatch.match };
  }

  return { type: 'word', value: word };
}

function normalizeDirection(dir: string): string {
  if (patterns.FORWARD_WORDS.includes(dir)) return 'forward';
  if (patterns.BACKWARD_WORDS.includes(dir)) return 'backward';
  if (patterns.LEFT_WORDS.includes(dir)) return 'left';
  if (patterns.RIGHT_WORDS.includes(dir)) return 'right';
  return dir;
}
```

**Step 6: Create main parser**

Create `src/lib/parser/index.ts`:
```typescript
import { tokenize, Token } from './tokenizer';
import * as patterns from './patterns';
import { Defaults, DEFAULT_VALUES } from '../../types';

export interface ParseResult {
  success: boolean;
  pythonCode?: string;
  needsClarification?: {
    field: string;
    message: string;
    type: 'distance' | 'angle' | 'duration';
  };
  error?: string;
  confidence: number;
}

export function parseCommand(
  input: string,
  defaults: Defaults = DEFAULT_VALUES,
  motorNames: string[] = []
): ParseResult {
  const tokens = tokenize(input);

  if (tokens.length === 0) {
    return { success: false, error: 'Empty command', confidence: 0 };
  }

  // Try to match different command patterns
  const moveResult = tryParseMove(tokens, defaults);
  if (moveResult) return moveResult;

  const turnResult = tryParseTurn(tokens, defaults);
  if (turnResult) return turnResult;

  const waitResult = tryParseWait(tokens);
  if (waitResult) return waitResult;

  const motorResult = tryParseMotor(tokens, defaults, motorNames);
  if (motorResult) return motorResult;

  const stopResult = tryParseStop(tokens, motorNames);
  if (stopResult) return stopResult;

  // No pattern matched
  return {
    success: false,
    error: 'Could not parse command',
    confidence: 0,
  };
}

function tryParseMove(tokens: Token[], defaults: Defaults): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.MOVE_VERBS.includes(t.normalized || t.value)
  );
  const direction = tokens.find((t) => t.type === 'direction');
  const number = tokens.find((t) => t.type === 'number');
  const unit = tokens.find((t) => t.type === 'unit');

  // Check if this looks like a move command
  if (!hasVerb && !direction) return null;
  if (direction && !['forward', 'backward'].includes(direction.normalized || '')) return null;

  // Need distance - require clarification if missing
  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'distance',
        message: 'How far should the robot move?',
        type: 'distance',
      },
      confidence: 0.7,
    };
  }

  // Calculate distance in mm
  let distance = number.numericValue || 0;
  if (unit) {
    const conversion = patterns.UNIT_CONVERSIONS[unit.normalized || unit.value];
    if (conversion) {
      distance *= conversion;
    }
  }

  // Negative for backward
  if (direction?.normalized === 'backward') {
    distance = -distance;
  }

  return {
    success: true,
    pythonCode: `robot.straight(${distance})`,
    confidence: 0.95,
  };
}

function tryParseTurn(tokens: Token[], defaults: Defaults): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.TURN_VERBS.includes(t.normalized || t.value)
  );
  const direction = tokens.find((t) => t.type === 'direction');
  const number = tokens.find((t) => t.type === 'number');

  if (!hasVerb && !direction) return null;
  if (direction && !['left', 'right'].includes(direction.normalized || '')) return null;

  // Need angle - require clarification if missing
  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'angle',
        message: 'What angle should the robot turn?',
        type: 'angle',
      },
      confidence: 0.7,
    };
  }

  let angle = number.numericValue || 0;

  // Negative for left turn
  if (direction?.normalized === 'left') {
    angle = -angle;
  }

  return {
    success: true,
    pythonCode: `robot.turn(${angle})`,
    confidence: 0.95,
  };
}

function tryParseWait(tokens: Token[]): ParseResult | null {
  const hasVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.WAIT_VERBS.includes(t.normalized || t.value)
  );

  if (!hasVerb) return null;

  const number = tokens.find((t) => t.type === 'number');
  const unit = tokens.find((t) => t.type === 'unit');

  // Need duration - require clarification if missing
  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'duration',
        message: 'How long should the robot wait?',
        type: 'duration',
      },
      confidence: 0.7,
    };
  }

  let duration = number.numericValue || 0;
  if (unit) {
    const conversion = patterns.TIME_CONVERSIONS[unit.normalized || unit.value];
    if (conversion) {
      duration *= conversion;
    } else {
      // Default to seconds if unit looks like time but not recognized
      duration *= 1000;
    }
  } else {
    // Default to milliseconds if no unit
    duration *= 1000;
  }

  return {
    success: true,
    pythonCode: `wait(${Math.round(duration)})`,
    confidence: 0.9,
  };
}

function tryParseMotor(
  tokens: Token[],
  defaults: Defaults,
  motorNames: string[]
): ParseResult | null {
  const hasRunVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.RUN_VERBS.includes(t.normalized || t.value)
  );
  const hasMotor = tokens.some((t) => t.type === 'motor');

  if (!hasRunVerb || !hasMotor) return null;

  const motorToken = tokens.find((t) => t.type === 'motor');
  const motorName = motorToken?.value || 'motor';

  const number = tokens.find((t) => t.type === 'number');
  const unit = tokens.find((t) => t.type === 'unit');

  if (!number) {
    return {
      success: false,
      needsClarification: {
        field: 'angle',
        message: `How many degrees should the ${motorName} motor run?`,
        type: 'angle',
      },
      confidence: 0.7,
    };
  }

  const angle = number.numericValue || 0;
  const speed = defaults.motorSpeed;

  return {
    success: true,
    pythonCode: `${motorName}.run_angle(${speed}, ${angle})`,
    confidence: 0.85,
  };
}

function tryParseStop(tokens: Token[], motorNames: string[]): ParseResult | null {
  const hasStopVerb = tokens.some(
    (t) => t.type === 'verb' && patterns.STOP_VERBS.includes(t.normalized || t.value)
  );

  if (!hasStopVerb) return null;

  const hasMotor = tokens.some((t) => t.type === 'motor');
  const motorToken = tokens.find((t) => t.type === 'motor');

  if (hasMotor && motorToken) {
    return {
      success: true,
      pythonCode: `${motorToken.value}.stop()`,
      confidence: 0.9,
    };
  }

  return {
    success: true,
    pythonCode: `robot.stop()`,
    confidence: 0.85,
  };
}

export { tokenize } from './tokenizer';
```

**Step 7: Write tests**

Create `src/lib/parser/__tests__/parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../index';
import { levenshteinDistance, isFuzzyMatch } from '../fuzzyMatch';

describe('fuzzyMatch', () => {
  it('calculates levenshtein distance correctly', () => {
    expect(levenshteinDistance('forward', 'forward')).toBe(0);
    expect(levenshteinDistance('forward', 'forwrad')).toBe(2);
    expect(levenshteinDistance('forward', 'frwrd')).toBe(2);
  });

  it('matches with tolerance', () => {
    expect(isFuzzyMatch('forwrad', 'forward', 3)).toBe(true);
    expect(isFuzzyMatch('frwrd', 'forward', 3)).toBe(true);
    expect(isFuzzyMatch('xyz', 'forward', 3)).toBe(false);
  });
});

describe('parseCommand', () => {
  describe('move commands', () => {
    it('parses "move forward 200mm"', () => {
      const result = parseCommand('move forward 200mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(200)');
    });

    it('parses "go forward 100"', () => {
      const result = parseCommand('go forward 100');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(100)');
    });

    it('parses with typo "move forwrad 200mm"', () => {
      const result = parseCommand('move forwrad 200mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(200)');
    });

    it('parses "move backward 150mm"', () => {
      const result = parseCommand('move backward 150mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(-150)');
    });

    it('asks for clarification when distance missing', () => {
      const result = parseCommand('move forward');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('distance');
    });

    it('handles centimeters', () => {
      const result = parseCommand('move forward 10cm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(100)');
    });
  });

  describe('turn commands', () => {
    it('parses "turn right 90 degrees"', () => {
      const result = parseCommand('turn right 90 degrees');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(90)');
    });

    it('parses "turn left 45"', () => {
      const result = parseCommand('turn left 45');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(-45)');
    });

    it('asks for clarification when angle missing', () => {
      const result = parseCommand('turn right');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('angle');
    });
  });

  describe('wait commands', () => {
    it('parses "wait 500ms"', () => {
      const result = parseCommand('wait 500ms');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(500)');
    });

    it('parses "wait 2 seconds"', () => {
      const result = parseCommand('wait 2 seconds');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(2000)');
    });

    it('asks for clarification when duration missing', () => {
      const result = parseCommand('wait');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('duration');
    });
  });

  describe('motor commands', () => {
    it('parses "run arm motor for 90 degrees"', () => {
      const result = parseCommand('run arm motor for 90 degrees');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toContain('arm.run_angle');
      expect(result.pythonCode).toContain('90');
    });
  });

  describe('stop commands', () => {
    it('parses "stop"', () => {
      const result = parseCommand('stop');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.stop()');
    });

    it('parses "stop arm motor"', () => {
      const result = parseCommand('stop arm motor');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('arm.stop()');
    });
  });
});
```

**Step 8: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass

**Step 9: Commit**

Run:
```bash
git add .
git commit -m "feat: implement rule-based parser with fuzzy matching"
```

---

## Phase 4: Integration & Remaining Features

*Note: The following phases follow the same pattern - TDD with bite-sized steps. For brevity, I'll outline the tasks without full code.*

### Task 4.1: Integrate Parser with Editor

**Files:**
- Modify: `src/components/editor/MainSection.tsx`
- Create: `src/hooks/useParser.ts`

**Summary:** Create hook that watches input, parses commands, updates store with results.

---

### Task 4.2: Add Clarification Dialog

**Files:**
- Create: `src/components/editor/ClarificationDialog.tsx`
- Modify: `src/components/editor/MainSection.tsx`

**Summary:** Popup when command needs clarification (distance/angle/duration).

---

### Task 4.3: Code Generation from Profile

**Files:**
- Create: `src/lib/codegen/index.ts`
- Create: `src/lib/codegen/setupCode.ts`

**Summary:** Generate Pybricks setup code from robot profile.

---

### Task 4.4: Web Bluetooth Connection

**Files:**
- Create: `src/lib/bluetooth/pybricks.ts`
- Create: `src/hooks/useBluetooth.ts`
- Modify: `src/components/layout/Header.tsx`

**Summary:** Implement Pybricks BLE protocol for hub connection and code upload.

---

### Task 4.5: Cloud AI Integration

**Files:**
- Create: `src/lib/ai/client.ts`
- Create: `src/lib/ai/prompts.ts`
- Modify: `src/lib/parser/index.ts`

**Summary:** Fallback to cloud AI when rule-based parser fails or confidence is low.

---

### Task 4.6: Supabase Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/auth.ts`
- Create: `src/lib/supabase/programs.ts`
- Create: `supabase/migrations/001_initial.sql`

**Summary:** Database schema, auth, and CRUD for programs/profiles.

---

### Task 4.7: Error Handling UI

**Files:**
- Create: `src/components/editor/ErrorDisplay.tsx`
- Create: `src/lib/errors/translate.ts`

**Summary:** Translate Python errors to natural language, suggest fixes.

---

### Task 4.8: Preview Path Calculation

**Files:**
- Create: `src/lib/preview/pathCalculator.ts`
- Modify: `src/components/preview/PreviewPanel.tsx`

**Summary:** Calculate robot path from commands using wheel diameter/axle track.

---

### Task 4.9: Autocomplete

**Files:**
- Create: `src/components/editor/Autocomplete.tsx`
- Create: `src/lib/autocomplete/suggestions.ts`

**Summary:** Inline ghost text with arrow key cycling through alternatives.

---

### Task 4.10: Custom Routines

**Files:**
- Create: `src/lib/parser/routines.ts`
- Modify: `src/components/editor/RoutinesSection.tsx`

**Summary:** Parse routine definitions, store, and allow reuse.

---

### Task 4.11: Team Sharing & Collaboration

**Files:**
- Create: `src/components/sharing/ShareDialog.tsx`
- Create: `src/lib/supabase/sharing.ts`
- Create: `src/hooks/useEditLock.ts`

**Summary:** Share programs, editing locks with cooldown.

---

### Task 4.12: Offline Support

**Files:**
- Create: `src/lib/offline/indexeddb.ts`
- Create: `src/lib/offline/queue.ts`
- Create: `src/hooks/useOffline.ts`

**Summary:** IndexedDB storage, offline queue, sync when online.

---

### Task 4.13: Accessibility

**Files:**
- Modify: All component files for ARIA labels
- Create: `src/components/shared/AccessibilitySettings.tsx`
- Update: `tailwind.config.js` for high contrast

**Summary:** Keyboard navigation, screen reader support, high contrast, dyslexia font.

---

### Task 4.14: Onboarding Tutorial

**Files:**
- Create: `src/components/onboarding/Tutorial.tsx`
- Create: `src/components/onboarding/TooltipTour.tsx`
- Create: `src/stores/onboardingStore.ts`

**Summary:** Interactive tutorial + tooltip tour for new users.

---

### Task 4.15: GitHub Integration

**Files:**
- Create: `src/lib/github/client.ts`
- Create: `src/components/settings/GitHubSettings.tsx`

**Summary:** Optional GitHub sync with auto-push every 30 min.

---

## Appendix: File Structure

```
dragonbricks/
├── docs/
│   └── plans/
│       ├── 2026-01-31-dragonbricks-design.md
│       └── 2026-01-31-dragonbricks-implementation.md
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── SetupSection.tsx
│   │   │   ├── MainSection.tsx
│   │   │   ├── RoutinesSection.tsx
│   │   │   ├── ClarificationDialog.tsx
│   │   │   ├── ErrorDisplay.tsx
│   │   │   └── Autocomplete.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── preview/
│   │   │   └── PreviewPanel.tsx
│   │   ├── profile/
│   │   │   └── ProfileEditor.tsx
│   │   ├── sharing/
│   │   │   └── ShareDialog.tsx
│   │   ├── onboarding/
│   │   │   ├── Tutorial.tsx
│   │   │   └── TooltipTour.tsx
│   │   └── shared/
│   │       ├── ResizeHandle.tsx
│   │       └── AccessibilitySettings.tsx
│   ├── hooks/
│   │   ├── useParser.ts
│   │   ├── useBluetooth.ts
│   │   ├── useEditLock.ts
│   │   └── useOffline.ts
│   ├── lib/
│   │   ├── parser/
│   │   │   ├── index.ts
│   │   │   ├── tokenizer.ts
│   │   │   ├── fuzzyMatch.ts
│   │   │   ├── patterns.ts
│   │   │   └── routines.ts
│   │   ├── bluetooth/
│   │   │   └── pybricks.ts
│   │   ├── ai/
│   │   │   ├── client.ts
│   │   │   └── prompts.ts
│   │   ├── codegen/
│   │   │   ├── index.ts
│   │   │   └── setupCode.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── programs.ts
│   │   │   └── sharing.ts
│   │   ├── preview/
│   │   │   └── pathCalculator.ts
│   │   ├── errors/
│   │   │   └── translate.ts
│   │   ├── offline/
│   │   │   ├── indexeddb.ts
│   │   │   └── queue.ts
│   │   ├── github/
│   │   │   └── client.ts
│   │   └── autocomplete/
│   │       └── suggestions.ts
│   ├── stores/
│   │   ├── editorStore.ts
│   │   ├── profileStore.ts
│   │   ├── connectionStore.ts
│   │   ├── previewStore.ts
│   │   └── onboardingStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```
