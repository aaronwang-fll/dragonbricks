import { useState } from 'react';
import { useWaypointStore } from '../../stores/waypointStore';
import { FieldCanvas } from './FieldCanvas';
import { WaypointToolbar } from './WaypointToolbar';
import { WaypointSidebar } from './WaypointSidebar';
import { SaveWaypointDialog } from './SaveWaypointDialog';

interface WaypointPageProps {
  onBack: () => void;
}

export function WaypointPage({ onBack }: WaypointPageProps) {
  const { computedPath, generatedCode, reset } = useWaypointStore();
  const [showCode, setShowCode] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">Waypoint Navigator</h1>

        <div className="flex-1" />

        {/* Status indicators */}
        {computedPath && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {computedPath.segments.length} segments
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {computedPath.totalDistance}mm
            </span>
            {computedPath.hasCollision && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Collision
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {generatedCode && (
            <>
              <button
                onClick={() => setShowCode(!showCode)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showCode ? 'Hide Code' : 'Show Code'}
              </button>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Save Path
              </button>
            </>
          )}
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <WaypointToolbar />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        <FieldCanvas />
        <WaypointSidebar />
      </div>

      {/* Code preview */}
      {showCode && generatedCode && (
        <div className="h-48 border-t border-gray-200 dark:border-gray-700 bg-gray-900 overflow-auto">
          <pre className="p-4 text-xs text-green-400 font-mono whitespace-pre">{generatedCode}</pre>
        </div>
      )}

      {/* Save dialog */}
      {showSaveDialog && (
        <SaveWaypointDialog
          onClose={() => setShowSaveDialog(false)}
          onSaved={() => {
            setShowSaveDialog(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}
