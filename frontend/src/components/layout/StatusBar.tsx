import { useConnectionStore } from '../../stores/connectionStore';
import { useEditorStore } from '../../stores/editorStore';

export function StatusBar() {
  const { error } = useConnectionStore();
  const { isAiProcessing } = useEditorStore();

  return (
    <footer className="h-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        <span className="text-gray-600 dark:text-gray-400">DragonBricks <span className="text-gray-400 dark:text-gray-500">v0.1 beta</span></span>
      </div>

      <div className="flex items-center gap-3">
        {isAiProcessing && (
          <span className="flex items-center gap-2 text-blue-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs">AI processing...</span>
          </span>
        )}
        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>
    </footer>
  );
}
