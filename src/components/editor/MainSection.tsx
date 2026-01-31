import { useState, useCallback } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useParser } from '../../hooks/useParser';

interface MainSectionProps {
  onClarificationNeeded?: (commandId: string, clarification: {
    field: string;
    message: string;
    type: 'distance' | 'angle' | 'duration';
  }) => void;
}

export function MainSection({ onClarificationNeeded }: MainSectionProps) {
  const [input, setInput] = useState('');
  const [isParsed, setIsParsed] = useState(false);
  const { commands, expandedCommands, toggleCommandExpanded, expandAllCommands, collapseAllCommands } = useEditorStore();
  const { parseInput } = useParser();

  const handleParse = useCallback(() => {
    if (!input.trim()) return;

    const parsedCommands = parseInput(input);
    setIsParsed(true);

    // Check for clarifications needed
    const needsClarification = parsedCommands.find(cmd => cmd.status === 'needs-clarification');
    if (needsClarification && needsClarification.clarification && onClarificationNeeded) {
      onClarificationNeeded(needsClarification.id, needsClarification.clarification);
    }
  }, [input, parseInput, onClarificationNeeded]);

  const handleEdit = useCallback(() => {
    // Go back to editing mode
    const currentText = commands.map(cmd => cmd.naturalLanguage).join('\n');
    setInput(currentText);
    setIsParsed(false);
  }, [commands]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to parse
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleParse();
    }
  }, [handleParse]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'parsed':
        return <span className="text-green-500">✓</span>;
      case 'needs-clarification':
        return <span className="text-yellow-500">?</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      default:
        return <span className="text-gray-400">○</span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'parsed':
        return 'border-l-green-500';
      case 'needs-clarification':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 p-3 overflow-y-auto">
        {!isParsed || commands.length === 0 ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Type natural language commands here...\n\nExamples:\n  move forward 200mm\n  turn right 90 degrees\n  wait 1 second\n\nPress Ctrl+Enter to parse`}
            className="w-full h-full resize-none border-0 outline-none text-sm font-mono"
            autoFocus
          />
        ) : (
          <div className="space-y-1">
            {commands.map((cmd) => (
              <div
                key={cmd.id}
                className={`group border-l-2 pl-2 ${getStatusColor(cmd.status)}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCommandExpanded(cmd.id)}
                    className="text-gray-400 hover:text-gray-600 w-4"
                  >
                    {expandedCommands.has(cmd.id) ? '▼' : '▶'}
                  </button>
                  {getStatusIcon(cmd.status)}
                  <span className="text-sm font-mono flex-1">{cmd.naturalLanguage}</span>
                </div>

                {expandedCommands.has(cmd.id) && (
                  <div className="ml-8 mt-1">
                    {cmd.pythonCode && (
                      <pre className="p-2 bg-gray-50 text-xs text-gray-600 rounded">
                        {cmd.pythonCode}
                      </pre>
                    )}
                    {cmd.error && (
                      <p className="p-2 bg-red-50 text-xs text-red-600 rounded">
                        {cmd.error}
                      </p>
                    )}
                    {cmd.clarification && (
                      <p className="p-2 bg-yellow-50 text-xs text-yellow-700 rounded">
                        {cmd.clarification.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 flex justify-between items-center">
        <div className="flex gap-2">
          {!isParsed ? (
            <button
              onClick={handleParse}
              disabled={!input.trim()}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded"
            >
              Parse
            </button>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded"
              >
                Edit
              </button>
              <button
                onClick={expandAllCommands}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Expand All
              </button>
              <button
                onClick={collapseAllCommands}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Collapse All
              </button>
            </>
          )}
        </div>

        {isParsed && commands.length > 0 && (
          <div className="text-xs text-gray-500">
            {commands.filter(c => c.status === 'parsed').length}/{commands.length} parsed
          </div>
        )}
      </div>
    </div>
  );
}
