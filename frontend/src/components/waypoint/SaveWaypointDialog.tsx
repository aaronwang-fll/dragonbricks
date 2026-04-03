import { useState, useCallback } from 'react';
import { useWaypointStore } from '../../stores/waypointStore';
import { useEditorStore } from '../../stores/editorStore';
import { generateWaypointProgram } from '../../lib/waypoint/waypointCodegen';

interface SaveWaypointDialogProps {
  onClose: () => void;
  onSaved: () => void;
}

export function SaveWaypointDialog({ onClose, onSaved }: SaveWaypointDialogProps) {
  const { computedPath, generatedCode } = useWaypointStore();
  const { defaults, currentProgram, updateProgram, addProgram } = useEditorStore();
  const [saveMode, setSaveMode] = useState<'routine' | 'program'>('routine');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }

    if (!computedPath || !generatedCode) {
      setError('Generate a path first.');
      return;
    }

    if (saveMode === 'routine') {
      if (!currentProgram) {
        setError('No active program. Save as a program instead.');
        return;
      }
      const newRoutine = {
        id: `routine-${Date.now()}`,
        name: name.trim(),
        parameters: [],
        body: generatedCode,
      };
      updateProgram(currentProgram.id, {
        routines: [...(currentProgram.routines || []), newRoutine],
      });
    } else {
      const fullCode = generateWaypointProgram(computedPath, {
        leftMotorPort: defaults.leftMotorPort || 'A',
        rightMotorPort: defaults.rightMotorPort || 'B',
        wheelDiameter: defaults.wheelDiameter || 56,
        axleTrack: defaults.axleTrack || 112,
        speed: defaults.speed || 200,
        acceleration: defaults.acceleration || 700,
        turnRate: defaults.turnRate || 150,
        turnAcceleration: defaults.turnAcceleration || 300,
      });

      addProgram({
        id: `program-${Date.now()}`,
        name: name.trim(),
        setupSection: '',
        mainSection: fullCode,
        routines: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        profileId: null,
      });
    }

    onSaved();
  }, [
    name,
    saveMode,
    computedPath,
    generatedCode,
    defaults,
    currentProgram,
    updateProgram,
    addProgram,
    onSaved,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Save Waypoint Path
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Path summary */}
          {computedPath && (
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <p>Segments: {computedPath.segments.length}</p>
              <p>Total distance: {computedPath.totalDistance}mm</p>
              {computedPath.hasCollision && (
                <p className="text-red-500 font-medium">
                  Warning: Path collides with {computedPath.collidingObstacleIds.length} obstacle(s)
                </p>
              )}
            </div>
          )}

          {/* Save mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSaveMode('routine')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                saveMode === 'routine'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Save as Routine
            </button>
            <button
              onClick={() => setSaveMode('program')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                saveMode === 'program'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              Save as Program
            </button>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {saveMode === 'routine' ? 'Routine' : 'Program'} Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder={
                saveMode === 'routine' ? 'e.g., navigate_to_mission_1' : 'e.g., Mission 1 Path'
              }
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400"
              autoFocus
            />
          </div>

          {/* Code preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code Preview
            </label>
            <pre className="max-h-48 p-3 bg-gray-900 text-green-400 text-xs font-mono rounded-lg overflow-auto whitespace-pre">
              {generatedCode || '# Generate a path first'}
            </pre>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!computedPath || !generatedCode}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
