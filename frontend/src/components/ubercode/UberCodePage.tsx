import { useState, useCallback, useMemo, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useUberCodeStore } from '../../stores/ubercodeStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { generateUberCode } from '../../lib/ubercode/generator';
import { uploadProgram, startProgram } from '../../lib/bluetooth/pybricks';
import { api } from '../../lib/api';
import type { HubButton, ButtonAction } from '../../types/ubercode';

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
  { value: 'stop', label: 'Emergency stop' },
  { value: 'unused', label: 'Unused' },
];

const ACTION_LABELS: Record<ButtonAction, string> = {
  run: 'Run current',
  next: 'Next run',
  previous: 'Previous run',
  stop: 'Emergency stop',
  unused: 'Unused',
};

export function UberCodePage({ onBack }: UberCodePageProps) {
  const programs = useEditorStore((s) => s.programs);
  const defaults = useEditorStore((s) => s.defaults);
  const addProgram = useEditorStore((s) => s.addProgram);
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
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const name = file.name.replace(/\.(txt|py)$/i, '');
        const newProgram = {
          id: `program-${Date.now()}`,
          name,
          setupSection: '',
          mainSection: content,
          routines: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          profileId: null,
        };
        addProgram(newProgram);
        addRun({ programId: newProgram.id, programName: name });
      };
      reader.readAsText(file);

      // Reset so the same file can be re-imported
      e.target.value = '';
    },
    [addProgram, addRun],
  );

  // Detect overlapping button mappings (multiple buttons with the same action)
  const overlapWarnings = useMemo(() => {
    const actionToButtons = new Map<ButtonAction, HubButton[]>();
    for (const button of Object.keys(BUTTON_LABELS) as HubButton[]) {
      const action = buttonMapping[button];
      if (action === 'unused') continue;
      const existing = actionToButtons.get(action) || [];
      existing.push(button);
      actionToButtons.set(action, existing);
    }
    const warnings: string[] = [];
    for (const [action, buttons] of actionToButtons) {
      if (buttons.length > 1) {
        const names = buttons.map((b) => BUTTON_LABELS[b]).join(' and ');
        warnings.push(`"${ACTION_LABELS[action]}" is assigned to both ${names}.`);
      }
    }
    return warnings;
  }, [buttonMapping]);

  // Programs not yet added as runs
  const availablePrograms = programs.filter((p) => !runs.some((r) => r.programId === p.id));

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

          const lines = program.mainSection.split('\n').filter((l) => l.trim());

          if (lines.length === 0) {
            return { name: program.name, mainCode: 'pass', imports: '', setup: '' };
          }

          const routines =
            program.routines?.map((r) => ({
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
              : lines.map((_, i) => response.results[i]?.python_code || '# ???').join('\n');

          // Include routine defs in the main code if present
          const routinesMarker = '# Routines/Functions\n';
          const routinesIdx = full.indexOf(routinesMarker);
          let routinesDefs = '';
          if (routinesIdx >= 0) {
            const routinesEnd = full.indexOf('\n\n# Main program', routinesIdx);
            routinesDefs = full
              .slice(
                routinesIdx + routinesMarker.length,
                routinesEnd >= 0 ? routinesEnd : undefined,
              )
              .trim();
          }

          const combinedMain = routinesDefs ? `${routinesDefs}\n\n${mainCode}` : mainCode;

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

  const handleSaveAsProgram = useCallback(() => {
    if (!generatedCode) return;
    const runNames = runs.map((r) => r.programName).join(', ');
    const name = `UberCode (${runNames})`;
    addProgram({
      id: `program-${Date.now()}`,
      name,
      setupSection: '',
      mainSection: generatedCode,
      routines: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileId: null,
    });
    onBack();
  }, [generatedCode, runs, addProgram, onBack]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header bar */}
      <div className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">UberCode Builder</h1>
      </div>

      {/* Main content -- 3-column layout */}
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
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import from file
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".txt,.py"
              onChange={handleImportFile}
              className="hidden"
            />
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveRun(index, index + 1)}
                    disabled={index === runs.length - 1}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeRun(run.programId)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Assign an action to each button
            </p>
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

            {/* Overlap warnings */}
            {overlapWarnings.length > 0 && (
              <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700/50 rounded-lg">
                {overlapWarnings.map((w) => (
                  <p key={w} className="text-xs text-yellow-700 dark:text-yellow-300">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Long-press hint */}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Tip: Long-pressing Center always force-stops the program, regardless of its mapping
              here.
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
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
                <button
                  onClick={handleSaveAsProgram}
                  className="w-full py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Save as Program
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Code preview */}
      {showCode && generatedCode && (
        <div className="h-64 border-t border-gray-200 dark:border-gray-700 bg-gray-900 overflow-auto">
          <pre className="p-4 text-xs text-green-400 font-mono whitespace-pre">{generatedCode}</pre>
        </div>
      )}
    </div>
  );
}
