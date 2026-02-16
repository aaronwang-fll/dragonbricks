import { useState, useRef, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useBluetooth } from '../../hooks/useBluetooth';
import { useFirmwareStore } from '../../stores/firmwareStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';

interface HeaderProps {
  onSettingsClick: () => void;
  onNavigateToLogin: () => void;
}

export function Header({ onSettingsClick, onNavigateToLogin }: HeaderProps) {
  const { status, programStatus } = useConnectionStore();
  const { isSupported, connect, disconnect, run, stop } = useBluetooth();
  const { openWizard } = useFirmwareStore();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const statusConfig = {
    disconnected: { dot: 'bg-gray-400' },
    connecting: { dot: 'bg-yellow-500 animate-pulse' },
    connected: { dot: 'bg-green-500' },
    error: { dot: 'bg-red-500' },
  };

  const handleRun = async () => {
    await run();
  };

  const handleStop = async () => {
    await stop();
  };

  const handleLogout = () => {
    api.logout();
    clearUser();
    onNavigateToLogin();
  };

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
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
            className="w-10 h-10 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
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
            className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors group relative"
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
        {!isAuthenticated && (
          <div className="hidden lg:flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Local mode.</span>
            <button
              onClick={onNavigateToLogin}
              className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in for cloud sync
            </button>
          </div>
        )}

        {isAuthenticated && user && (
          <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300">{user.username}</span>
        )}

        {/* Tools Menu */}
        <div className="relative" ref={toolsMenuRef}>
          <button
            onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
            className="h-10 px-3 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group relative"
            aria-label="Tools"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-300 text-sm">Tools</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {toolsMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    openWizard();
                    setToolsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Install Pybricks Firmware
                </button>
                <a
                  href="https://code.pybricks.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setToolsMenuOpen(false)}
                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore LEGO Firmware
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Connect Hub button */}
        <button
          onClick={handleConnect}
          disabled={!isSupported || isConnecting}
          className="h-10 px-3 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors group relative"
          aria-label="Connect Hub"
        >
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
          </svg>
          <span className={`w-2 h-2 rounded-full ${statusConfig[status].dot}`} />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Hub'}
          </span>
        </button>

        <button
          onClick={onSettingsClick}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group relative"
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

        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="h-10 px-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={onNavigateToLogin}
            className="h-10 px-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
