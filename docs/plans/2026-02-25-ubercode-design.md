# UberCode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated UberCode page that compiles multiple saved programs into a single master program, navigable via SPIKE Prime hub buttons during FLL competition matches.

**Architecture:** Frontend-only feature. A new page lets users pick programs as "runs," configure button mappings, and generates a combined Python program with a button-driven menu loop. The generated code is compiled and uploaded via the existing BLE pipeline. Each program's main section is parsed independently via the existing backend parse API, then the results are stitched together in the frontend.

**Tech Stack:** React + TypeScript, Zustand store, Tailwind CSS, existing `api.parseCommands()` + `uploadProgram()` + `compilePython()`.

---

## Task 1: Types

**Files:**
- Create: `frontend/src/types/ubercode.ts`

**Step 1: Create the types file**

```typescript
// frontend/src/types/ubercode.ts

export type HubButton = 'center' | 'left' | 'right' | 'bluetooth';

export type ButtonAction = 'run' | 'next' | 'previous' | 'unused';

export interface ButtonMapping {
  center: ButtonAction;
  left: ButtonAction;
  right: ButtonAction;
  bluetooth: ButtonAction;
}

export interface UberCodeRun {
  programId: string;
  programName: string;
}

export const DEFAULT_BUTTON_MAPPING: ButtonMapping = {
  center: 'run',
  right: 'next',
  left: 'previous',
  bluetooth: 'unused',
};

/** Maps our button names to Pybricks Button enum values */
export const PYBRICKS_BUTTON_MAP: Record<HubButton, string> = {
  center: 'Button.CENTER',
  left: 'Button.LEFT',
  right: 'Button.RIGHT',
  bluetooth: 'Button.BLUETOOTH',
};
```

**Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add frontend/src/types/ubercode.ts
git commit -m "feat(ubercode): add types for button mapping and run config"
```

---

## Task 2: Zustand Store

**Files:**
- Create: `frontend/src/stores/ubercodeStore.ts`

**Step 1: Create the store**

```typescript
// frontend/src/stores/ubercodeStore.ts
import { create } from 'zustand';
import type { UberCodeRun, ButtonMapping } from '../types/ubercode';
import { DEFAULT_BUTTON_MAPPING } from '../types/ubercode';

interface UberCodeState {
  runs: UberCodeRun[];
  buttonMapping: ButtonMapping;
  generatedCode: string;
  isGenerating: boolean;
  error: string | null;

  setRuns: (runs: UberCodeRun[]) => void;
  addRun: (run: UberCodeRun) => void;
  removeRun: (programId: string) => void;
  moveRun: (fromIndex: number, toIndex: number) => void;
  setButtonMapping: (mapping: ButtonMapping) => void;
  setGeneratedCode: (code: string) => void;
  setIsGenerating: (val: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  runs: [] as UberCodeRun[],
  buttonMapping: DEFAULT_BUTTON_MAPPING,
  generatedCode: '',
  isGenerating: false,
  error: null as string | null,
};

export const useUberCodeStore = create<UberCodeState>((set) => ({
  ...initialState,

  setRuns: (runs) => set({ runs }),
  addRun: (run) =>
    set((state) => ({
      runs: [...state.runs, run],
      generatedCode: '',
    })),
  removeRun: (programId) =>
    set((state) => ({
      runs: state.runs.filter((r) => r.programId !== programId),
      generatedCode: '',
    })),
  moveRun: (fromIndex, toIndex) =>
    set((state) => {
      const newRuns = [...state.runs];
      const [moved] = newRuns.splice(fromIndex, 1);
      newRuns.splice(toIndex, 0, moved);
      return { runs: newRuns, generatedCode: '' };
    }),
  setButtonMapping: (mapping) => set({ buttonMapping: mapping, generatedCode: '' }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
```

**Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/src/stores/ubercodeStore.ts
git commit -m "feat(ubercode): add Zustand store for runs and button config"
```

---

## Task 3: Code Generator — Tests First

**Files:**
- Create: `frontend/src/lib/ubercode/__tests__/generator.test.ts`

**Step 1: Write the failing tests**

```typescript
// frontend/src/lib/ubercode/__tests__/generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateUberCode } from '../generator';
import type { ButtonMapping } from '../../../types/ubercode';

const defaultMapping: ButtonMapping = {
  center: 'run',
  right: 'next',
  left: 'previous',
  bluetooth: 'unused',
};

describe('generateUberCode', () => {
  it('generates a program with two runs', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.robotics import DriveBase\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()\nrobot = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=112)',
      },
      [
        { name: 'Mission 1', mainCode: 'robot.straight(200)' },
        { name: 'Mission 2', mainCode: 'robot.turn(90)\nrobot.straight(100)' },
      ],
      defaultMapping,
    );

    expect(code).toContain('from pybricks.hubs import PrimeHub');
    expect(code).toContain('from pybricks.parameters import Button');
    expect(code).toContain('def run_1():');
    expect(code).toContain('def run_2():');
    expect(code).toContain('robot.straight(200)');
    expect(code).toContain('robot.turn(90)');
    expect(code).toContain('runs = [run_1, run_2]');
    expect(code).toContain('Button.CENTER');
    expect(code).toContain('hub.display.number(current + 1)');
  });

  it('maps buttons correctly per config', () => {
    const mapping: ButtonMapping = {
      center: 'next',
      right: 'run',
      left: 'unused',
      bluetooth: 'previous',
    };

    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Run A', mainCode: 'wait(1000)' }],
      mapping,
    );

    // Right is run
    expect(code).toContain('Button.RIGHT');
    // Bluetooth is previous
    expect(code).toContain('Button.BLUETOOTH');
    // Left is unused — should NOT appear in if/elif chain
    expect(code).not.toContain('Button.LEFT');
  });

  it('auto-advances after running', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [
        { name: 'R1', mainCode: 'wait(100)' },
        { name: 'R2', mainCode: 'wait(200)' },
      ],
      defaultMapping,
    );

    // After running, current should advance
    expect(code).toContain('current = min(current + 1, len(runs) - 1)');
  });

  it('includes Button import even if not in original imports', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Test', mainCode: 'pass' }],
      defaultMapping,
    );

    expect(code).toContain('from pybricks.parameters import Button');
  });

  it('handles single run', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Only Run', mainCode: 'wait(500)' }],
      defaultMapping,
    );

    expect(code).toContain('runs = [run_1]');
    expect(code).toContain('def run_1():');
  });

  it('includes run names as comments', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Coral Reef', mainCode: 'wait(100)' }],
      defaultMapping,
    );

    expect(code).toContain('# Run 1: Coral Reef');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/ubercode/__tests__/generator.test.ts`
Expected: FAIL (module not found)

**Step 3: Commit failing tests**

```bash
git add frontend/src/lib/ubercode/__tests__/generator.test.ts
git commit -m "test(ubercode): add failing tests for code generator"
```

---

## Task 4: Code Generator — Implementation

**Files:**
- Create: `frontend/src/lib/ubercode/generator.ts`

**Step 1: Implement the generator**

```typescript
// frontend/src/lib/ubercode/generator.ts
import type { ButtonMapping, HubButton } from '../../types/ubercode';
import { PYBRICKS_BUTTON_MAP } from '../../types/ubercode';

export interface SharedSetup {
  imports: string;
  setup: string;
}

export interface RunCode {
  name: string;
  mainCode: string;
}

/**
 * Generates a combined "UberCode" program from multiple runs.
 *
 * Structure:
 *   1. Imports (merged, with Button added)
 *   2. Shared setup (motors, sensors, drivebase)
 *   3. Run functions (def run_1, def run_2, ...)
 *   4. Menu loop (hub buttons to navigate & execute runs)
 */
export function generateUberCode(
  shared: SharedSetup,
  runs: RunCode[],
  buttonMapping: ButtonMapping,
): string {
  const lines: string[] = [];

  // --- 1. Imports ---
  // Ensure Button is imported
  let imports = shared.imports;
  if (!imports.includes('from pybricks.parameters import')) {
    imports += '\nfrom pybricks.parameters import Button';
  } else if (!imports.includes('Button')) {
    imports = imports.replace(
      /from pybricks\.parameters import (.+)/,
      'from pybricks.parameters import $1, Button',
    );
  }
  // Ensure wait is imported
  if (!imports.includes('from pybricks.tools import')) {
    imports += '\nfrom pybricks.tools import wait';
  }
  lines.push(imports);
  lines.push('');

  // --- 2. Setup ---
  lines.push(shared.setup);
  lines.push('');

  // --- 3. Run functions ---
  runs.forEach((run, i) => {
    const num = i + 1;
    lines.push(`# Run ${num}: ${run.name}`);
    lines.push(`def run_${num}():`);
    const body = run.mainCode.trim();
    if (!body) {
      lines.push('    pass');
    } else {
      for (const bodyLine of body.split('\n')) {
        lines.push(`    ${bodyLine}`);
      }
    }
    lines.push('');
  });

  // --- 4. Menu loop ---
  const runList = runs.map((_, i) => `run_${i + 1}`).join(', ');
  lines.push(`runs = [${runList}]`);
  lines.push('current = 0');
  lines.push('');
  lines.push('while True:');
  lines.push('    hub.display.number(current + 1)');
  lines.push('    while not hub.buttons.pressed():');
  lines.push('        wait(50)');
  lines.push('    pressed = hub.buttons.pressed()');
  lines.push('    while hub.buttons.pressed():');
  lines.push('        wait(50)');

  // Build button action branches
  const actionMap = buildActionMap(buttonMapping);
  let first = true;
  for (const [action, pybricksButton] of actionMap) {
    const keyword = first ? '    if' : '    elif';
    first = false;

    if (action === 'run') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        runs[current]()');
      lines.push('        current = min(current + 1, len(runs) - 1)');
    } else if (action === 'next') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        current = min(current + 1, len(runs) - 1)');
    } else if (action === 'previous') {
      lines.push(`${keyword} ${pybricksButton} in pressed:`);
      lines.push('        current = max(current - 1, 0)');
    }
  }

  lines.push('');
  return lines.join('\n');
}

/** Returns ordered list of [action, pybricksButtonString] for non-unused buttons. */
function buildActionMap(
  mapping: ButtonMapping,
): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  // Process in priority order: run first, then next, then previous
  const priorityOrder: Array<{ action: string; button: HubButton }> = [];

  for (const button of ['center', 'left', 'right', 'bluetooth'] as HubButton[]) {
    const action = mapping[button];
    if (action !== 'unused') {
      priorityOrder.push({ action, button });
    }
  }

  // Sort: run first, next second, previous third
  const actionPriority: Record<string, number> = { run: 0, next: 1, previous: 2 };
  priorityOrder.sort((a, b) => (actionPriority[a.action] ?? 9) - (actionPriority[b.action] ?? 9));

  for (const { action, button } of priorityOrder) {
    result.push([action, PYBRICKS_BUTTON_MAP[button]]);
  }

  return result;
}
```

**Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/ubercode/__tests__/generator.test.ts`
Expected: ALL PASS

**Step 3: Run full type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/lib/ubercode/generator.ts
git commit -m "feat(ubercode): implement code generator for combined run programs"
```

---

## Task 5: UberCode Page — UI

**Files:**
- Create: `frontend/src/components/ubercode/UberCodePage.tsx`

This is the main page component. It contains:
- Left: list of available programs (from editor store)
- Center: ordered run list (add/remove/reorder)
- Right: button mapping config + Generate & Upload button
- Bottom: generated code preview

**Step 1: Create the page component**

```tsx
// frontend/src/components/ubercode/UberCodePage.tsx
import { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useUberCodeStore } from '../../stores/ubercodeStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { generateUberCode } from '../../lib/ubercode/generator';
import { uploadProgram, startProgram } from '../../lib/bluetooth/pybricks';
import { api } from '../../lib/api';
import type { ButtonMapping, HubButton, ButtonAction } from '../../types/ubercode';

interface UberCodePageProps {
  onBack: () => void;
}

const BUTTON_LABELS: Record<HubButton, string> = {
  center: 'Center (Home)',
  left: 'Left Arrow',
  right: 'Right Arrow',
  bluetooth: 'Bluetooth',
};

const ACTION_OPTIONS: { value: ButtonAction; label: string }[] = [
  { value: 'run', label: 'Run current' },
  { value: 'next', label: 'Next run' },
  { value: 'previous', label: 'Previous run' },
  { value: 'unused', label: 'Unused' },
];

export function UberCodePage({ onBack }: UberCodePageProps) {
  const programs = useEditorStore((s) => s.programs);
  const defaults = useEditorStore((s) => s.defaults);
  const {
    runs,
    buttonMapping,
    generatedCode,
    isGenerating,
    error,
    addRun,
    removeRun,
    moveRun,
    setButtonMapping,
    setGeneratedCode,
    setIsGenerating,
    setError,
  } = useUberCodeStore();
  const hubStatus = useConnectionStore((s) => s.status);
  const isConnected = hubStatus === 'connected';

  const [showCode, setShowCode] = useState(false);

  // Programs not yet added as runs
  const availablePrograms = programs.filter(
    (p) => !runs.some((r) => r.programId === p.id),
  );

  const handleAddRun = useCallback(
    (programId: string) => {
      const program = programs.find((p) => p.id === programId);
      if (program) {
        addRun({ programId: program.id, programName: program.name });
      }
    },
    [programs, addRun],
  );

  const handleButtonChange = useCallback(
    (button: HubButton, action: ButtonAction) => {
      setButtonMapping({ ...buttonMapping, [button]: action });
    },
    [buttonMapping, setButtonMapping],
  );

  const handleGenerate = useCallback(async () => {
    if (runs.length === 0) {
      setError('Add at least one run.');
      return;
    }

    // Validate: must have exactly one 'run' button
    const runButtons = Object.values(buttonMapping).filter((a) => a === 'run');
    if (runButtons.length === 0) {
      setError('You must assign a "Run current" button.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Parse each program to get its generated code sections
      const config = {
        left_motor_port: defaults.leftMotorPort || 'A',
        right_motor_port: defaults.rightMotorPort || 'B',
        wheel_diameter: defaults.wheelDiameter || 56,
        axle_track: defaults.axleTrack || 112,
        speed: defaults.speed || 200,
        acceleration: defaults.acceleration || 700,
        turn_rate: defaults.turnRate || 150,
        turn_acceleration: defaults.turnAcceleration || 300,
        motor_speed: defaults.motorSpeed || 200,
        attachment1_port: defaults.attachment1Port || 'None',
        attachment2_port: defaults.attachment2Port || 'None',
        color_sensor_port: defaults.colorSensorPort || 'None',
        ultrasonic_port: defaults.ultrasonicPort || 'None',
        force_port: defaults.forcePort || 'None',
      };

      // Parse all programs in parallel
      const parseResults = await Promise.all(
        runs.map(async (run) => {
          const program = programs.find((p) => p.id === run.programId);
          if (!program) throw new Error(`Program "${run.programName}" not found.`);

          const lines = program.mainSection
            .split('\n')
            .filter((l) => l.trim());

          if (lines.length === 0) {
            return { name: program.name, mainCode: 'pass', imports: '', setup: '' };
          }

          const routines = program.routines?.map((r) => ({
            name: r.name,
            parameters: r.parameters,
            body: r.body,
          })) || [];

          const response = await api.parseCommands(lines, config, routines);

          // Extract main code: everything after "# Main program" in generated_code
          const full = response.generated_code;
          const mainMarker = '# Main program\n';
          const mainIdx = full.indexOf(mainMarker);
          const mainCode =
            mainIdx >= 0
              ? full.slice(mainIdx + mainMarker.length).trim()
              : lines
                  .map((_, i) => response.results[i]?.python_code || '# ???')
                  .join('\n');

          // Include routine defs in the main code if present
          const routinesMarker = '# Routines/Functions\n';
          const routinesIdx = full.indexOf(routinesMarker);
          let routinesDefs = '';
          if (routinesIdx >= 0) {
            const routinesEnd = full.indexOf('\n\n# Main program', routinesIdx);
            routinesDefs = full.slice(
              routinesIdx + routinesMarker.length,
              routinesEnd >= 0 ? routinesEnd : undefined,
            ).trim();
          }

          const combinedMain = routinesDefs
            ? `${routinesDefs}\n\n${mainCode}`
            : mainCode;

          return {
            name: program.name,
            mainCode: combinedMain,
            imports: response.imports,
            setup: response.setup,
          };
        }),
      );

      // Use the first program's imports/setup as shared (they share the same robot)
      const shared = {
        imports: parseResults[0].imports,
        setup: parseResults[0].setup,
      };

      const runCodes = parseResults.map((r) => ({
        name: r.name,
        mainCode: r.mainCode,
      }));

      const code = generateUberCode(shared, runCodes, buttonMapping);
      setGeneratedCode(code);
      setShowCode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate UberCode.');
    } finally {
      setIsGenerating(false);
    }
  }, [runs, programs, defaults, buttonMapping, setGeneratedCode, setIsGenerating, setError]);

  const handleUpload = useCallback(async () => {
    if (!generatedCode) return;
    try {
      setIsGenerating(true);
      setError(null);
      const uploaded = await uploadProgram(generatedCode);
      if (!uploaded) {
        setError('Upload failed.');
        return;
      }
      await startProgram();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsGenerating(false);
    }
  }, [generatedCode, setIsGenerating, setError]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header bar */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">UberCode Builder</h1>
      </div>

      {/* Main content — 3-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Available programs */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Programs</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to add as a run</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {availablePrograms.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                {programs.length === 0 ? 'No programs yet' : 'All programs added'}
              </p>
            )}
            {availablePrograms.map((program) => (
              <button
                key={program.id}
                onClick={() => handleAddRun(program.id)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                {program.name}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Run order */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Run Order</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Runs execute in this order. Use arrows to reorder.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {runs.length === 0 && (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">
                Add programs from the left panel
              </p>
            )}
            {runs.map((run, index) => (
              <div
                key={run.programId}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-gray-800 dark:text-white font-medium truncate">
                  {run.programName}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveRun(index, index - 1)}
                    disabled={index === 0}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveRun(index, index + 1)}
                    disabled={index === runs.length - 1}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeRun(run.programId)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Config panel */}
        <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Hub Buttons</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Assign an action to each button</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(Object.keys(BUTTON_LABELS) as HubButton[]).map((button) => (
              <div key={button}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {BUTTON_LABELS[button]}
                </label>
                <select
                  value={buttonMapping[button]}
                  onChange={(e) => handleButtonChange(button, e.target.value as ButtonAction)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || runs.length === 0}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate UberCode'}
            </button>
            {generatedCode && (
              <>
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  {showCode ? 'Hide Code' : 'Show Code'}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!isConnected || isGenerating}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {!isConnected ? 'Connect hub to upload' : 'Upload & Run'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Code preview */}
      {showCode && generatedCode && (
        <div className="h-64 border-t border-gray-200 dark:border-gray-700 bg-gray-900 overflow-auto">
          <pre className="p-4 text-xs text-green-400 font-mono whitespace-pre">
            {generatedCode}
          </pre>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/src/components/ubercode/UberCodePage.tsx
git commit -m "feat(ubercode): add UberCode builder page with run ordering and button config"
```

---

## Task 6: Wire Into App — Navigation

**Files:**
- Modify: `frontend/src/App.tsx:16-17` (add `'ubercode'` to Page type)
- Modify: `frontend/src/App.tsx:93-95` (add ubercode page render)
- Modify: `frontend/src/components/layout/Header.tsx:17-20` (add onUberCodeClick prop)
- Modify: `frontend/src/components/layout/Header.tsx:215-264` (add menu item)

**Step 1: Update App.tsx — add page type and render**

In `frontend/src/App.tsx`:

1. Add import at top:
```typescript
import { UberCodePage } from './components/ubercode/UberCodePage';
```

2. Change the Page type (line 16):
```typescript
type Page = 'login' | 'register' | 'main' | 'settings' | 'ubercode';
```

3. Add the ubercode page render after the settings block (after line 95):
```typescript
  if (currentPage === 'ubercode') {
    return <UberCodePage onBack={() => setCurrentPage('main')} />;
  }
```

**Step 2: Update Header — add UberCode nav**

In `frontend/src/components/layout/Header.tsx`:

1. Add `onUberCodeClick` to the `HeaderProps` interface:
```typescript
interface HeaderProps {
  onSettingsClick: () => void;
  onNavigateToLogin: () => void;
  onUberCodeClick: () => void;
}
```

2. Destructure it in the component:
```typescript
export function Header({ onSettingsClick, onNavigateToLogin, onUberCodeClick }: HeaderProps) {
```

3. Add a menu item in the Tools dropdown (after the "Restore LEGO Firmware" button, before the closing `</div>` of py-1):
```tsx
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onUberCodeClick();
                    setToolsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  UberCode Builder
                </button>
```

4. Update the Header usage in App.tsx (line 99-102):
```tsx
      <Header
        onSettingsClick={() => setCurrentPage('settings')}
        onNavigateToLogin={() => setCurrentPage('login')}
        onUberCodeClick={() => setCurrentPage('ubercode')}
      />
```

**Step 3: Verify types compile**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

**Step 4: Run all tests**

Run: `cd frontend && npm run test:run`
Expected: ALL PASS

**Step 5: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Header.tsx frontend/src/components/ubercode/UberCodePage.tsx
git commit -m "feat(ubercode): wire UberCode page into app navigation via Tools menu"
```

---

## Task 7: Manual Verification

**Step 1: Start dev server**

Run: `cd frontend && npx vite --host`

**Step 2: Test the full flow**

1. Open `http://localhost:5173`
2. Create 2-3 programs with simple commands (e.g., "move forward 200mm", "turn right 90 degrees")
3. Open Tools menu → click "UberCode Builder"
4. Add programs to the run list
5. Reorder with arrows, remove one
6. Change button mappings
7. Click "Generate UberCode"
8. Verify generated code looks correct (imports, setup, run functions, menu loop)
9. Click "Show Code" to inspect
10. (If hub connected) Click "Upload & Run"

**Step 3: Verify light mode and dark mode look correct**

**Step 4: Final commit if any fixes needed**
