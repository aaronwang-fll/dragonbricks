import { useState, useCallback, useEffect, useRef } from 'react';
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
  const { commands } = useEditorStore();
  const { parseInput } = useParser();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse input with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (input.trim()) {
        const parsedCommands = parseInput(input);

        // Check for clarifications needed
        const needsClarification = parsedCommands.find(cmd => cmd.status === 'needs-clarification');
        if (needsClarification && needsClarification.clarification && onClarificationNeeded) {
          onClarificationNeeded(needsClarification.id, needsClarification.clarification);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input, parseInput, onClarificationNeeded]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'parsed':
        return <span className="text-green-500 text-xs">✓</span>;
      case 'needs-clarification':
        return <span className="text-yellow-500 text-xs">?</span>;
      case 'error':
        return <span className="text-red-500 text-xs">!</span>;
      default:
        return <span className="text-gray-400 text-xs">○</span>;
    }
  }, []);

  const getLineStatus = useCallback((lineIndex: number) => {
    const cmd = commands[lineIndex];
    return cmd ? cmd.status : 'pending';
  }, [commands]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const lines = input.split('\n');

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Line status indicators */}
        <div className="w-8 bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-hidden">
          <div className="pt-3 px-1">
            {lines.map((_, i) => (
              <div key={i} className="h-5 flex items-center justify-center">
                {input.trim() && lines[i]?.trim() && getStatusIcon(getLineStatus(i))}
              </div>
            ))}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 relative overflow-hidden">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder={`Type commands in plain English...

Examples:
  move forward 200mm
  turn right 90 degrees
  wait 1 second
  run grabber motor 180 degrees

Commands are parsed as you type.
Python code appears in the right panel.`}
            className="absolute inset-0 w-full h-full resize-none border-0 outline-none text-sm font-mono p-3 leading-5"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Footer status */}
      {commands.length > 0 && (
        <div className="px-3 py-1 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-3 bg-gray-50">
          <span className="flex items-center gap-1">
            <span className="text-green-500">✓</span>
            {commands.filter(c => c.status === 'parsed').length} parsed
          </span>
          {commands.filter(c => c.status === 'needs-clarification').length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-yellow-500">?</span>
              {commands.filter(c => c.status === 'needs-clarification').length} need input
            </span>
          )}
          {commands.filter(c => c.status === 'error').length > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-red-500">!</span>
              {commands.filter(c => c.status === 'error').length} errors
            </span>
          )}
        </div>
      )}
    </div>
  );
}
