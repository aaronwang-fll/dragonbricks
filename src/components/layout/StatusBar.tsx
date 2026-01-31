import { useConnectionStore } from '../../stores/connectionStore';

export function StatusBar() {
  const { error } = useConnectionStore();

  return (
    <footer className="h-8 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        <span className="text-gray-400">DragonBricks <span className="text-gray-500">v0.1 beta</span></span>
      </div>

      <div className="flex items-center gap-3">
        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
    </footer>
  );
}
