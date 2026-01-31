import { useConnectionStore } from '../../stores/connectionStore';

export function Header() {
  const { programStatus } = useConnectionStore();

  const handleRun = () => {
    console.log('Run program');
  };

  const handlePause = () => {
    console.log('Pause program');
  };

  const handleStop = () => {
    console.log('Stop program');
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">DragonBricks</h1>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={handleRun}
            disabled={programStatus === 'running'}
            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>▶</span> Run
          </button>
          <button
            onClick={handlePause}
            disabled={programStatus !== 'running'}
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>⏸</span> Pause
          </button>
          <button
            onClick={handleStop}
            disabled={programStatus === 'idle'}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white text-sm font-medium rounded flex items-center gap-1"
          >
            <span>⏹</span> Stop
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded text-sm">
          Settings
        </button>
        <button className="p-2 hover:bg-gray-100 rounded text-sm">
          Account
        </button>
      </div>
    </header>
  );
}
