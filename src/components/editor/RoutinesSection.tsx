import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import type { Routine } from '../../types';

export function RoutinesSection() {
  const { currentProgram, showRoutines, setShowRoutines, updateProgram } = useEditorStore();
  const routines = currentProgram?.routines || [];
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const sectionRef = useRef<HTMLDivElement>(null);
  const mainSectionRef = useRef<HTMLElement | null>(null);

  // Find the main section element on mount
  useEffect(() => {
    mainSectionRef.current = document.querySelector('[data-main-section]');
  }, []);

  // Scroll when routines section is expanded/collapsed
  useEffect(() => {
    if (showRoutines && sectionRef.current) {
      // When expanded, scroll to show routines content (but not all the way to top)
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (!showRoutines && mainSectionRef.current) {
      // When collapsed, scroll back to show main section
      mainSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showRoutines]);

  const handleAddRoutine = useCallback(() => {
    if (!currentProgram) return;

    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      name: `routine_${routines.length + 1}`,
      parameters: [],
      body: '# Add commands here\nmove forward 100mm',
    };

    updateProgram(currentProgram.id, {
      routines: [...routines, newRoutine],
    });

    setExpandedRoutine(newRoutine.id);
    setEditingRoutine(newRoutine.id);
    setEditValue(newRoutine.body);
  }, [currentProgram, routines, updateProgram]);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    if (!currentProgram) return;

    updateProgram(currentProgram.id, {
      routines: routines.filter(r => r.id !== routineId),
    });
  }, [currentProgram, routines, updateProgram]);

  const handleSaveRoutine = useCallback((routineId: string) => {
    if (!currentProgram) return;

    updateProgram(currentProgram.id, {
      routines: routines.map(r =>
        r.id === routineId ? { ...r, body: editValue } : r
      ),
    });

    setEditingRoutine(null);
  }, [currentProgram, routines, editValue, updateProgram]);

  const handleRenameRoutine = useCallback((routineId: string, newName: string) => {
    if (!currentProgram) return;

    // Sanitize name: lowercase, replace spaces with underscores, alphanumeric only
    const sanitized = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (!sanitized) return;

    updateProgram(currentProgram.id, {
      routines: routines.map(r =>
        r.id === routineId ? { ...r, name: sanitized } : r
      ),
    });
  }, [currentProgram, routines, updateProgram]);

  const handleUpdateParameters = useCallback((routineId: string, paramsStr: string) => {
    if (!currentProgram) return;

    const parameters = paramsStr
      .split(',')
      .map(p => p.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);

    updateProgram(currentProgram.id, {
      routines: routines.map(r =>
        r.id === routineId ? { ...r, parameters } : r
      ),
    });
  }, [currentProgram, routines, updateProgram]);

  const toggleRoutine = useCallback((routineId: string) => {
    setExpandedRoutine(prev => prev === routineId ? null : routineId);
  }, []);

  return (
    <div ref={sectionRef} className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 h-full overflow-hidden flex flex-col">
      <button
        onClick={() => setShowRoutines(!showRoutines)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-expanded={showRoutines}
        aria-controls="routines-panel"
      >
        <div className="flex items-center gap-2">
          <span>{showRoutines ? '▼' : '▶'}</span>
          Routines ({routines.length})
        </div>
        {showRoutines && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddRoutine();
            }}
            className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
            aria-label="Add new routine"
          >
            + Add
          </button>
        )}
      </button>

      {showRoutines && (
        <div id="routines-panel" className="p-3 pt-0 overflow-y-auto flex-1">
          {routines.length === 0 ? (
            <div className="text-sm text-gray-400 italic py-2">
              <p>No routines defined.</p>
              <p className="mt-1 text-xs">
                Routines are reusable command sequences.
                Click "+ Add" to create one, or type in the editor:
              </p>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300">
{`Define turn_around:
  turn right 180 degrees

Define square with size:
  move forward size
  turn right 90
  move forward size
  turn right 90
  move forward size
  turn right 90
  move forward size`}
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
                >
                  {/* Routine header */}
                  <div
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => toggleRoutine(routine.id)}
                    role="button"
                    aria-expanded={expandedRoutine === routine.id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">
                        {expandedRoutine === routine.id ? '▼' : '▶'}
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-700 dark:text-gray-200">
                        {routine.name}
                      </span>
                      {routine.parameters.length > 0 && (
                        <span className="text-xs text-gray-400">
                          ({routine.parameters.join(', ')})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(routine.id);
                      }}
                      className="text-gray-400 hover:text-red-400 text-xs px-1"
                      aria-label={`Delete routine ${routine.name}`}
                    >
                      ×
                    </button>
                  </div>

                  {/* Routine body */}
                  {expandedRoutine === routine.id && (
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      {/* Name and parameters */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Name</label>
                          <input
                            type="text"
                            value={routine.name}
                            onChange={(e) => handleRenameRoutine(routine.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Parameters (comma-separated)</label>
                          <input
                            type="text"
                            value={routine.parameters.join(', ')}
                            onChange={(e) => handleUpdateParameters(routine.id, e.target.value)}
                            placeholder="e.g., distance, angle"
                            className="w-full px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Body editor */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Commands</label>
                        {editingRoutine === routine.id ? (
                          <div>
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full h-24 px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded resize-none bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                              placeholder="move forward 100mm&#10;turn right 90 degrees"
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleSaveRoutine(routine.id)}
                                className="px-2 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRoutine(null)}
                                className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-gray-700 dark:text-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                              {routine.body || '(empty)'}
                            </pre>
                            <button
                              onClick={() => {
                                setEditingRoutine(routine.id);
                                setEditValue(routine.body);
                              }}
                              className="mt-1 px-2 py-0.5 text-xs bg-gray-600 hover:bg-gray-500 rounded text-gray-200"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Usage hint */}
                      <div className="mt-2 text-xs text-gray-400 bg-blue-900/30 p-2 rounded">
                        <strong>Usage:</strong> Type <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{routine.name}</code>
                        {routine.parameters.length > 0 && (
                          <> with {routine.parameters.map((p, i) => (
                            <span key={p}>
                              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{p}</code>
                              {i < routine.parameters.length - 1 ? ', ' : ''}
                            </span>
                          ))}</>
                        )} in your commands.
                      </div>
                    </div>
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
