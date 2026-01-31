import { useState, useCallback, useEffect, useRef } from 'react';

interface ClarificationDialogProps {
  isOpen: boolean;
  commandId: string;
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
  onSubmit: (commandId: string, field: string, value: string) => void;
  onCancel: () => void;
}

export function ClarificationDialog({
  isOpen,
  commandId,
  field,
  message,
  type,
  onSubmit,
  onCancel,
}: ClarificationDialogProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset value when dialog opens with new command
    setValue('');
  }, [commandId]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(commandId, field, value.trim());
      setValue('');
    }
  }, [commandId, field, value, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  const getPlaceholder = () => {
    switch (type) {
      case 'distance':
        return 'e.g., 200';
      case 'angle':
        return 'e.g., 90';
      case 'duration':
        return 'e.g., 2';
      default:
        return '';
    }
  };

  const getUnit = () => {
    switch (type) {
      case 'distance':
        return 'mm';
      case 'angle':
        return 'degrees';
      case 'duration':
        return 'seconds';
      default:
        return '';
    }
  };

  const getQuickValues = () => {
    switch (type) {
      case 'distance':
        return ['50', '100', '200', '500'];
      case 'angle':
        return ['45', '90', '180', '360'];
      case 'duration':
        return ['0.5', '1', '2', '5'];
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-4 w-80"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Clarification Needed
        </h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={getPlaceholder()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="py-2 text-sm text-gray-500">{getUnit()}</span>
          </div>

          <div className="flex gap-1 mb-4">
            {getQuickValues().map((quickValue) => (
              <button
                key={quickValue}
                type="button"
                onClick={() => setValue(quickValue)}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs rounded"
              >
                {quickValue}
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-sm rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
