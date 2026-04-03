import { useState } from 'react';
import { useWaypointStore } from '../../stores/waypointStore';

export function WaypointSidebar() {
  const {
    startPose,
    endPose,
    waypoints,
    obstacles,
    robotSize,
    selectedId,
    setStartPose,
    setEndPose,
    updateWaypoint,
    removeWaypoint,
    moveWaypoint,
    removeObstacle,
    setRobotSize,
    setSelectedId,
  } = useWaypointStore();

  const [waypointsOpen, setWaypointsOpen] = useState(true);
  const [obstaclesOpen, setObstaclesOpen] = useState(true);
  const [robotOpen, setRobotOpen] = useState(true);

  return (
    <div className="w-64 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-y-auto">
      {/* Waypoints section */}
      <CollapsibleSection
        title="Waypoints"
        count={waypoints.length}
        isOpen={waypointsOpen}
        onToggle={() => setWaypointsOpen(!waypointsOpen)}
      >
        {waypoints.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2">
            Click on the field to add waypoints
          </p>
        ) : (
          <div className="space-y-1 p-2">
            {waypoints.map((wp, index) => (
              <div
                key={wp.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer ${
                  selectedId === wp.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedId(wp.id)}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                    wp.isPause ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={wp.name}
                    onChange={(e) => updateWaypoint(wp.id, { name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs text-gray-700 dark:text-gray-200 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-400 outline-none truncate"
                    placeholder={wp.isPause ? 'Pause' : 'Waypoint'}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                    ({Math.round(wp.position.x)}, {Math.round(wp.position.y)})
                  </span>
                  {wp.isPause && (
                    <input
                      type="number"
                      value={wp.pauseMs}
                      onChange={(e) => updateWaypoint(wp.id, { pauseMs: Number(e.target.value) })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 mt-0.5 px-1 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                      min={0}
                      step={100}
                    />
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWaypoint(index, index - 1);
                    }}
                    disabled={index === 0}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded text-[10px]"
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveWaypoint(index, index + 1);
                    }}
                    disabled={index === waypoints.length - 1}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded text-[10px]"
                  >
                    ▼
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWaypoint(wp.id);
                    }}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 rounded text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Obstacles section */}
      <CollapsibleSection
        title="Obstacles"
        count={obstacles.length}
        isOpen={obstaclesOpen}
        onToggle={() => setObstaclesOpen(!obstaclesOpen)}
      >
        {obstacles.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2">
            Use "Load Presets" or draw obstacles on the field
          </p>
        ) : (
          <div className="space-y-1 p-2">
            {obstacles.map((obs) => (
              <div
                key={obs.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer ${
                  selectedId === obs.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedId(obs.id)}
              >
                <span className="text-xs text-gray-700 dark:text-gray-200 flex-1 truncate">
                  {obs.name}
                  {obs.isPreset && (
                    <span className="ml-1 text-[9px] text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">
                      preset
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                  {Math.round(obs.width)}x{Math.round(obs.height)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObstacle(obs.id);
                  }}
                  className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 rounded text-[10px] shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Robot Config section */}
      <CollapsibleSection
        title="Robot Config"
        isOpen={robotOpen}
        onToggle={() => setRobotOpen(!robotOpen)}
      >
        <div className="p-3 space-y-3">
          {/* Robot size */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                Width (mm)
              </label>
              <input
                type="number"
                value={robotSize.width}
                onChange={(e) => setRobotSize({ ...robotSize, width: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                min={50}
                max={500}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                Length (mm)
              </label>
              <input
                type="number"
                value={robotSize.length}
                onChange={(e) => setRobotSize({ ...robotSize, length: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                min={50}
                max={500}
              />
            </div>
          </div>

          {/* Start pose */}
          <div>
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 font-medium">
              Start Position
            </label>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">X</label>
                <input
                  type="number"
                  value={Math.round(startPose.x)}
                  onChange={(e) => setStartPose({ ...startPose, x: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">Y</label>
                <input
                  type="number"
                  value={Math.round(startPose.y)}
                  onChange={(e) => setStartPose({ ...startPose, y: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">Angle</label>
                <input
                  type="number"
                  value={Math.round(startPose.angle)}
                  onChange={(e) => setStartPose({ ...startPose, angle: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
            </div>
          </div>

          {/* End pose */}
          <div>
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 font-medium">
              End Position
            </label>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">X</label>
                <input
                  type="number"
                  value={Math.round(endPose.x)}
                  onChange={(e) => setEndPose({ ...endPose, x: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">Y</label>
                <input
                  type="number"
                  value={Math.round(endPose.y)}
                  onChange={(e) => setEndPose({ ...endPose, y: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
              <div>
                <label className="block text-[9px] text-gray-400 dark:text-gray-500">Angle</label>
                <input
                  type="number"
                  value={Math.round(endPose.angle)}
                  onChange={(e) => setEndPose({ ...endPose, angle: Number(e.target.value) })}
                  className="w-full px-1.5 py-0.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, count, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span>
          {title}
          {count !== undefined && (
            <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-normal">
              ({count})
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && children}
    </div>
  );
}
