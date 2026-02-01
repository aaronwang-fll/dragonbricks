import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useParser } from '../../hooks/useParser';
import { Autocomplete, useAutocomplete } from './Autocomplete';

interface MainSectionProps {
  onClarificationNeeded?: (commandId: string, clarification: {
    field: string;
    message: string;
    type: 'distance' | 'angle' | 'duration';
  }) => void;
}

export function MainSection({ onClarificationNeeded }: MainSectionProps) {
  const [lines, setLines] = useState<string[]>(['']);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const { commands, defaults } = useEditorStore();
  const { parseInput } = useParser();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isOpen: autocompleteOpen, position: autocompletePosition, showAutocomplete, hideAutocomplete } = useAutocomplete();

  // Parse all lines with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const input = lines.join('\n');
      if (input.trim()) {
        parseInput(input);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [lines, parseInput]);

  const handleLineChange = useCallback((index: number, value: string) => {
    setLines(prev => {
      const newLines = [...prev];
      newLines[index] = value;
      return newLines;
    });
    hideAutocomplete(); // Close autocomplete when typing
  }, [hideAutocomplete]);

  const handleAutocompleteSelect = useCallback((newValue: string, newCursorPos: number) => {
    // The autocomplete works with full text, so we need to update just the active line
    setLines(prev => {
      const newLines = [...prev];
      newLines[activeLineIndex] = newValue;
      return newLines;
    });
    hideAutocomplete();
    // Focus and set cursor position
    setTimeout(() => {
      const input = inputRefs.current[activeLineIndex];
      if (input) {
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [activeLineIndex, hideAutocomplete]);

  const handleInputClick = useCallback((index: number, e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    setCursorPosition(input.selectionStart || 0);
    setActiveLineIndex(index);
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+Space to show autocomplete
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      const input = inputRefs.current[index];
      if (input && containerRef.current) {
        const rect = input.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        showAutocomplete(
          rect.left - containerRect.left,
          rect.bottom - containerRect.top + 4
        );
        setActiveLineIndex(index);
        setCursorPosition(input.selectionStart || 0);
      }
      return;
    }

    // Close autocomplete on Escape
    if (e.key === 'Escape' && autocompleteOpen) {
      e.preventDefault();
      hideAutocomplete();
      return;
    }

    // Let autocomplete handle arrow keys when open
    if (autocompleteOpen && ['ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key)) {
      return; // Autocomplete will handle these
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      hideAutocomplete();
      // Add new line after current
      setLines(prev => {
        const newLines = [...prev];
        newLines.splice(index + 1, 0, '');
        return newLines;
      });
      // Focus new line
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    } else if (e.key === 'Backspace' && lines[index] === '' && lines.length > 1) {
      e.preventDefault();
      // Remove empty line
      setLines(prev => prev.filter((_, i) => i !== index));
      // Focus previous line
      setTimeout(() => {
        inputRefs.current[Math.max(0, index - 1)]?.focus();
      }, 0);
    } else if (e.key === 'ArrowUp' && index > 0 && !autocompleteOpen) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown' && index < lines.length - 1 && !autocompleteOpen) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [lines, autocompleteOpen, showAutocomplete, hideAutocomplete]);

  const toggleLine = useCallback((index: number) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedLines(new Set());
      setAllExpanded(false);
    } else {
      const allIndices = new Set(lines.map((_, i) => i).filter(i => lines[i]?.trim()));
      setExpandedLines(allIndices);
      setAllExpanded(true);
    }
  }, [allExpanded, lines]);

  const handleLineClick = useCallback((index: number) => {
    const cmd = commands[index];
    if (cmd?.status === 'needs-clarification' && cmd.clarification && onClarificationNeeded) {
      onClarificationNeeded(cmd.id, cmd.clarification);
    }
  }, [commands, onClarificationNeeded]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'parsed':
        return <span className="text-green-500 text-xs" title="Parsed">✓</span>;
      case 'needs-clarification':
        return <span className="text-yellow-500 text-xs" title="Needs input">?</span>;
      case 'error':
        return <span className="text-red-500 text-xs" title="Error">!</span>;
      default:
        return <span className="text-gray-500 dark:text-gray-600 text-xs">○</span>;
    }
  }, []);

  const getLineStatus = useCallback((index: number) => {
    const cmd = commands[index];
    return cmd ? cmd.status : 'pending';
  }, [commands]);

  const getPythonCode = useCallback((index: number) => {
    const cmd = commands[index];
    if (cmd?.pythonCode) return cmd.pythonCode;
    if (cmd?.error) return `# Error: ${cmd.error}`;
    if (cmd?.status === 'needs-clarification') return `# Needs: ${cmd.clarification?.message || 'more info'}`;
    return '';
  }, [commands]);

  // Generate full Python code for export
  const generateFullCode = useCallback(() => {
    const codeLines: string[] = [];
    codeLines.push('from pybricks.hubs import PrimeHub');
    codeLines.push('from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor');
    codeLines.push('from pybricks.parameters import Port, Direction, Stop, Color');
    codeLines.push('from pybricks.robotics import DriveBase');
    codeLines.push('from pybricks.tools import wait, StopWatch');
    codeLines.push('');
    codeLines.push('# Initialize hub');
    codeLines.push('hub = PrimeHub()');
    codeLines.push('');
    codeLines.push('# Motors');
    codeLines.push('left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)');
    codeLines.push('right_motor = Motor(Port.B)');
    codeLines.push('');
    codeLines.push('# DriveBase');
    codeLines.push(`robot = DriveBase(left_motor, right_motor, wheel_diameter=${defaults.wheelDiameter}, axle_track=${defaults.axleTrack})`);
    codeLines.push('');
    codeLines.push('# Main program');
    commands.forEach((cmd) => {
      if (cmd.pythonCode && cmd.status === 'parsed') {
        codeLines.push(cmd.pythonCode);
      }
    });
    return codeLines.join('\n');
  }, [commands, defaults]);

  const handleCopy = useCallback(async () => {
    const code = generateFullCode();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateFullCode]);

  const handleDownload = useCallback(() => {
    const code = generateFullCode();
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    a.click();
    URL.revokeObjectURL(url);
  }, [generateFullCode]);

  const parsedCount = commands.filter(c => c.status === 'parsed').length;
  const needsInputCount = commands.filter(c => c.status === 'needs-clarification').length;
  const errorCount = commands.filter(c => c.status === 'error').length;
  const hasContent = lines.some(l => l.trim());

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Header with expand all and export options */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {hasContent && (
            <>
              <span className="flex items-center gap-1">
                <span className="text-green-500">✓</span> {parsedCount}
              </span>
              {needsInputCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">?</span> {needsInputCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="text-red-500">!</span> {errorCount}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasContent && (
            <>
              <button
                onClick={handleCopy}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={copied ? 'Copied!' : 'Copy full Python code'}
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Download as .py file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={toggleAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {allExpanded ? 'Collapse Python' : 'Expand Python'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lines with inline Python */}
      <div className="flex-1 overflow-y-auto pt-1">
        {lines.map((line, index) => {
          const status = getLineStatus(index);
          const isExpanded = expandedLines.has(index);
          const pythonCode = getPythonCode(index);
          const hasCode = line.trim() && pythonCode;
          const isClickable = status === 'needs-clarification';

          return (
            <div key={index} className="border-b border-gray-100 dark:border-gray-800">
              {/* Main row - flex wrap for long content */}
              <div className="flex flex-wrap items-center">
                {/* Line number */}
                <span className="w-10 text-xs text-gray-400 dark:text-gray-600 text-right pr-4 flex-shrink-0 select-none border-r border-gray-200 dark:border-gray-700">
                  {index + 1}
                </span>

                {/* Status icon */}
                <div
                  className={`w-4 flex items-center justify-center flex-shrink-0 ${isClickable ? 'cursor-pointer hover:bg-yellow-900/30' : ''}`}
                  onClick={() => isClickable && handleLineClick(index)}
                  title={isClickable ? 'Click to provide missing value' : undefined}
                >
                  {line.trim() && getStatusIcon(status)}
                </div>

                {/* Natural language input */}
                <input
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  value={line}
                  onChange={(e) => handleLineChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onClick={(e) => handleInputClick(index, e)}
                  placeholder={index === 0 && !line ? 'Type command... (Ctrl+Space for suggestions)' : ''}
                  className="flex-1 bg-transparent text-sm font-mono text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 py-2 pl-0 pr-0 outline-none border-0 min-w-[100px]"
                  spellCheck={false}
                />

                {/* Expand arrow - right after English text */}
                {hasCode && !isExpanded && (
                  <button
                    onClick={() => toggleLine(index)}
                    className="px-1 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    title="Show Python"
                  >
                    <span className="text-xs">▶</span>
                  </button>
                )}

                {/* Inline Python code (shown when expanded) */}
                {hasCode && isExpanded && (
                  <>
                    <span className="text-xs font-mono text-gray-400 ml-4 py-2">
                      {pythonCode.split('\n').map((codeLine, i) => (
                        <span key={i} className={codeLine.startsWith('#') ? 'text-gray-500' : 'text-gray-400'}>
                          {codeLine}{i < pythonCode.split('\n').length - 1 ? ' | ' : ''}
                        </span>
                      ))}
                    </span>
                    {/* Collapse arrow right after code */}
                    <button
                      onClick={() => toggleLine(index)}
                      className="px-1 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      title="Hide Python"
                    >
                      <span className="text-xs">◀</span>
                    </button>
                  </>
                )}

                {/* Spacer to fill remaining space */}
                <div className="flex-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder when empty */}
      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-600 text-sm">
            <p className="mb-2">Type commands in plain English</p>
            <p className="text-xs text-gray-700">
              Examples: move forward 200mm • turn right 90 degrees • wait 1 second
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Press Ctrl+Space for suggestions
            </p>
          </div>
        </div>
      )}

      {/* Autocomplete popup */}
      <Autocomplete
        value={lines[activeLineIndex] || ''}
        cursorPosition={cursorPosition}
        onSelect={handleAutocompleteSelect}
        onClose={hideAutocomplete}
        visible={autocompleteOpen}
        position={autocompletePosition}
      />
    </div>
  );
}
