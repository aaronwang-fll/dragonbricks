import { useState } from 'react';
import { translateError } from '../../lib/errors/translate';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
  compact?: boolean;
}

export function ErrorDisplay({ error, onDismiss, compact = false }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const translatedError = translateError(error);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <span>!</span>
        <span>{translatedError.userMessage}</span>
        {translatedError.suggestion && (
          <span className="text-red-500 dark:text-red-500">({translatedError.suggestion})</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 m-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-red-500 dark:text-red-400 mt-0.5">✕</span>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {translatedError.userMessage}
            </p>
            {translatedError.suggestion && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                💡 {translatedError.suggestion}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
          >
            ×
          </button>
        )}
      </div>

      {!translatedError.isKnownError && (
        <div className="mt-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
          >
            {showDetails ? 'Hide details' : 'Show technical details'}
          </button>

          {showDetails && (
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/50 rounded text-xs text-red-700 dark:text-red-300 overflow-x-auto">
              {translatedError.originalError}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface ErrorListProps {
  errors: string[];
  onClear?: () => void;
}

export function ErrorList({ errors, onClear }: ErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
          Errors ({errors.length})
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            Clear all
          </button>
        )}
      </div>
      {errors.map((error, index) => (
        <ErrorDisplay key={index} error={error} />
      ))}
    </div>
  );
}

// Tooltip-style error for inline display
interface ErrorTooltipProps {
  error: string;
  children: React.ReactNode;
}

export function ErrorTooltip({ error, children }: ErrorTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const translatedError = translateError(error);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-2 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-700 rounded-lg shadow-lg">
          <p className="text-xs font-medium text-red-800 dark:text-red-200">
            {translatedError.userMessage}
          </p>
          {translatedError.suggestion && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              💡 {translatedError.suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
