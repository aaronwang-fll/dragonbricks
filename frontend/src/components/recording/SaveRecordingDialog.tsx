import { useState } from 'react';
import type { RecordedCommand } from '../../types/recording';

interface SaveRecordingDialogProps {
  summary: RecordedCommand[];
  replayCode: string;
  routineName: string;
  onNameChange: (name: string) => void;
  onSave: (name: string, replayCode: string) => void;
  onDiscard: () => void;
}

export function SaveRecordingDialog({
  summary,
  replayCode,
  routineName,
  onNameChange,
  onSave,
  onDiscard,
}: SaveRecordingDialogProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleSave = () => {
    if (!routineName.trim()) return;
    onSave(routineName.trim(), replayCode);
  };

  const handleDiscard = () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onDiscard();
  };

  const codeLineCount = replayCode.split('\n').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Save Recording
          </h2>
        </div>

        {/* Name input */}
        <div className="px-4 py-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Routine Name
          </label>
          <input
            type="text"
            value={routineName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="my_recording"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>

        {/* Summary */}
        <div className="px-4 flex-1 overflow-y-auto min-h-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recording Summary
          </label>
          <div className="space-y-1 pb-2">
            {summary.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded text-sm"
              >
                <div className="min-w-0">
                  <p className="text-gray-700 dark:text-gray-200 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle raw code */}
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-blue-500 hover:text-blue-600 mb-2"
          >
            {showCode ? 'Hide' : 'Show'} generated code ({codeLineCount} lines)
          </button>

          {showCode && (
            <pre className="p-2 bg-gray-900 text-green-400 rounded text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto mb-2">
              {replayCode}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleDiscard}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              confirmDiscard
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {confirmDiscard ? 'Confirm Discard' : 'Discard'}
          </button>
          <button
            onClick={handleSave}
            disabled={!routineName.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Save as Routine
          </button>
        </div>
      </div>
    </div>
  );
}
