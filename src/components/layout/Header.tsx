import { useConnectionStore } from '../../stores/connectionStore';
import { useBluetooth } from '../../hooks/useBluetooth';

export function Header() {
  const { status, programStatus } = useConnectionStore();
  const { isSupported, connect, disconnect, run, stop } = useBluetooth();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const handleRun = async () => {
    await run();
  };

  const handleStop = async () => {
    await stop();
  };

  const getConnectionButtonText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Disconnect';
    return 'Connect Hub';
  };

  const getConnectionButtonClass = () => {
    if (isConnecting) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500 hover:bg-red-500';
    return 'bg-blue-500 hover:bg-blue-600';
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">DragonBricks</h1>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={handleRun}
            disabled={!isConnected || programStatus === 'running'}
            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded flex items-center gap-1"
            title={!isConnected ? 'Connect to hub first' : 'Run program'}
          >
            <span>▶</span> Run
          </button>
          <button
            onClick={handleStop}
            disabled={!isConnected || programStatus === 'idle'}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded flex items-center gap-1"
            title="Stop program"
          >
            <span>⏹</span> Stop
          </button>
        </div>

        {programStatus === 'running' && (
          <span className="text-sm text-green-600 animate-pulse">
            Running...
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isSupported && (
          <span className="text-xs text-red-500">
            Bluetooth not supported
          </span>
        )}

        <button
          onClick={handleConnect}
          disabled={!isSupported || isConnecting}
          className={`px-3 py-1.5 ${getConnectionButtonClass()} disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors`}
        >
          {getConnectionButtonText()}
        </button>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded text-sm text-gray-600">
            Settings
          </button>
        </div>
      </div>
    </header>
  );
}
