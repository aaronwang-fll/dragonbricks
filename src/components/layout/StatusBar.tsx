import { useConnectionStore } from '../../stores/connectionStore';
import { useBluetooth } from '../../hooks/useBluetooth';

export function StatusBar() {
  const { status, error } = useConnectionStore();
  const { isSupported, connect, disconnect } = useBluetooth();

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
    disconnected: { text: 'Disconnected', bg: 'bg-gray-200 dark:bg-gray-700', dot: 'bg-gray-400' },
    connecting: { text: 'Connecting...', bg: 'bg-yellow-100 dark:bg-yellow-900/30', dot: 'bg-yellow-500 animate-pulse' },
    connected: { text: 'Connected', bg: 'bg-green-100 dark:bg-green-900/30', dot: 'bg-green-500' },
    error: { text: 'Error', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' },
  };

  const config = statusConfig[status];

  return (
    <footer className="h-8 bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        <span className="text-gray-600 dark:text-gray-400">DragonBricks</span>
      </div>

      <div className="flex items-center gap-3">
        {error && (
          <span className="text-red-600 dark:text-red-400 text-xs">{error}</span>
        )}

        <button
          onClick={handleConnect}
          disabled={!isSupported || isConnecting}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.bg} hover:opacity-80 disabled:opacity-50 dark:text-gray-200`}
        >
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Connect Hub'}
        </button>

        {!isSupported && (
          <span className="text-xs text-red-500 dark:text-red-400">Bluetooth unavailable</span>
        )}
      </div>
    </footer>
  );
}
