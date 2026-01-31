import { useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useBluetooth } from '../../hooks/useBluetooth';
import { useThemeStore } from '../../stores/themeStore';

export function Header() {
  const { status, programStatus } = useConnectionStore();
  const { run, stop } = useBluetooth();
  const { mode, setMode } = useThemeStore();
  const [showSettings, setShowSettings] = useState(false);

  const isConnected = status === 'connected';

  const cycleTheme = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (mode) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '💻';
    }
  };

  const handleRun = async () => {
    await run();
  };

  const handleStop = async () => {
    await stop();
  };

  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          DragonBricks
        </h1>

        {/* Icon-only control buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={!isConnected || programStatus === 'running'}
            className="w-10 h-10 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
            aria-label="Run program"
          >
            <span className="text-xl">▶</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {!isConnected ? 'Connect hub first' : 'Run'}
            </span>
          </button>
          <button
            onClick={handleStop}
            disabled={!isConnected || programStatus === 'idle'}
            className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
            aria-label="Stop program"
          >
            <span className="text-xl">⏹</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Stop
            </span>
          </button>
        </div>

        {programStatus === 'running' && (
          <div className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Running</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors group relative"
          aria-label="Toggle theme"
        >
          <span className="text-lg">{getThemeIcon()}</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
          </span>
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors group relative"
          aria-label="Settings"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
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
          <div className="absolute top-14 right-4 z-50 bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-72 p-4">
            <h3 className="font-semibold text-white mb-3">Settings</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-300 mb-1">Default Speed (mm/s)</label>
                <input
                  type="number"
                  defaultValue={200}
                  className="w-full px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Default Turn Rate (deg/s)</label>
                <input
                  type="number"
                  defaultValue={150}
                  className="w-full px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Wheel Diameter (mm)</label>
                <input
                  type="number"
                  defaultValue={56}
                  className="w-full px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Axle Track (mm)</label>
                <input
                  type="number"
                  defaultValue={112}
                  className="w-full px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white"
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
