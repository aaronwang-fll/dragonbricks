import { useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useBluetooth } from '../../hooks/useBluetooth';

export function Header() {
  const { status, programStatus } = useConnectionStore();
  const { run, stop } = useBluetooth();
  const [showSettings, setShowSettings] = useState(false);

  const isConnected = status === 'connected';

  const handleRun = async () => {
    await run();
  };

  const handleStop = async () => {
    await stop();
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-gray-800">🐉 DragonBricks</h1>

        {/* Icon-only control buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={!isConnected || programStatus === 'running'}
            className="w-10 h-10 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
            aria-label="Run program"
          >
            <span className="text-xl">▶</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {!isConnected ? 'Connect hub first' : 'Run'}
            </span>
          </button>
          <button
            onClick={handleStop}
            disabled={!isConnected || programStatus === 'idle'}
            className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
            aria-label="Stop program"
          >
            <span className="text-xl">⏹</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Stop
            </span>
          </button>
        </div>

        {programStatus === 'running' && (
          <div className="flex items-center gap-2 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Running</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors group relative"
          aria-label="Settings"
        >
          <span className="text-xl">⚙️</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Settings
          </span>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute top-14 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-72 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Settings</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-600 mb-1">Default Speed (mm/s)</label>
                <input
                  type="number"
                  defaultValue={200}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Default Turn Rate (deg/s)</label>
                <input
                  type="number"
                  defaultValue={150}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Wheel Diameter (mm)</label>
                <input
                  type="number"
                  defaultValue={56}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Axle Track (mm)</label>
                <input
                  type="number"
                  defaultValue={112}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                />
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Save
            </button>
          </div>
        </>
      )}
    </header>
  );
}
