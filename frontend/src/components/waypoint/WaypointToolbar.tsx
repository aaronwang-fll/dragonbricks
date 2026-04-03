import { useState } from 'react';
import { useWaypointStore } from '../../stores/waypointStore';
import { planPath } from '../../lib/waypoint/pathPlanner';
import { generateWaypointCode } from '../../lib/waypoint/waypointCodegen';
import { CropImageDialog } from './CropImageDialog';
import type { WaypointTool } from '../../types/waypoint';

const TOOLS: { value: WaypointTool; label: string; icon: string }[] = [
  { value: 'select', label: 'Select', icon: '↖' },
  { value: 'waypoint', label: 'Waypoint', icon: '◉' },
  { value: 'pause', label: 'Pause', icon: '⏸' },
  { value: 'obstacle', label: 'Obstacle', icon: '▢' },
];

export function WaypointToolbar() {
  const [rawImageDataUrl, setRawImageDataUrl] = useState<string | null>(null);

  const {
    activeTool,
    setActiveTool,
    startPose,
    endPose,
    waypoints,
    obstacles,
    robotSize,
    computedPath,
    setComputedPath,
    setGeneratedCode,
    setFieldImageDataUrl,
    zoom,
    setZoom,
  } = useWaypointStore();

  const handleGenerate = () => {
    const path = planPath(startPose, endPose, waypoints, obstacles, robotSize);
    setComputedPath(path);
    const code = generateWaypointCode(path);
    setGeneratedCode(code);
  };

  const handleClear = () => {
    setComputedPath(null);
    setGeneratedCode('');
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Tool buttons */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.value}
            onClick={() => setActiveTool(tool.value)}
            className={`px-2.5 py-1.5 text-sm rounded transition-colors ${
              activeTool === tool.value
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={tool.label}
          >
            <span className="mr-1">{tool.icon}</span>
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Generate / Clear */}
      <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <button
          onClick={handleGenerate}
          className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          Generate Path
        </button>
        {computedPath && (
          <button
            onClick={handleClear}
            className="px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Clear Path
          </button>
        )}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => setZoom(zoom - 0.25)}
          disabled={zoom <= 0.25}
          className="w-7 h-7 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 rounded"
        >
          −
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.25)}
          disabled={zoom >= 4}
          className="w-7 h-7 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 rounded"
        >
          +
        </button>
      </div>
      {rawImageDataUrl && (
        <CropImageDialog
          imageDataUrl={rawImageDataUrl}
          onApply={(croppedUrl) => {
            setFieldImageDataUrl(croppedUrl);
            setRawImageDataUrl(null);
          }}
          onCancel={() => setRawImageDataUrl(null)}
        />
      )}
    </div>
  );
}
