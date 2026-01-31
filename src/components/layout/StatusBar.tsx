import { useConnectionStore } from '../../stores/connectionStore';

export function StatusBar() {
  const { status, error } = useConnectionStore();

  const statusText = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Hub Connected',
    error: 'Connection Error',
  };

  const statusColor = {
    disconnected: 'text-gray-500',
    connecting: 'text-yellow-600',
    connected: 'text-green-600',
    error: 'text-red-600',
  };

  return (
    <footer className="h-6 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
      <span>Status: Ready</span>
      <span className={statusColor[status]}>{error || statusText[status]}</span>
    </footer>
  );
}
