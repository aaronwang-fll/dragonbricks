import { useState } from 'react';
import { translateError } from '../../lib/errors/translate';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const translatedError = translateError(error);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 m-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-red-500 mt-0.5">✕</span>
          <div>
            <p className="text-sm font-medium text-red-800">
              {translatedError.userMessage}
            </p>
            {translatedError.suggestion && (
              <p className="text-sm text-red-600 mt-1">
                {translatedError.suggestion}
              </p>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        )}
      </div>

      {!translatedError.isKnownError && (
        <div className="mt-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            {showDetails ? 'Hide details' : 'Show technical details'}
          </button>

          {showDetails && (
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700 overflow-x-auto">
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
        <span className="text-xs font-semibold text-red-600 uppercase">
          Errors ({errors.length})
        </span>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-red-600 hover:text-red-800"
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
