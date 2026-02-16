import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import type { Suggestion } from '../../lib/api';

interface AutocompleteProps {
  value: string;
  cursorPosition: number;
  onSelect: (newValue: string, newCursorPosition: number) => void;
  onClose: () => void;
  visible: boolean;
  position: { x: number; y: number };
}

export function Autocomplete({
  value,
  cursorPosition,
  onSelect,
  onClose,
  visible,
  position,
}: AutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // null = loading, empty array = no results
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const fetchIdRef = useRef(0);

  // Reset suggestions when becoming invisible (render-time state adjustment)
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setSuggestions(null);
    }
  }

  useEffect(() => {
    if (!visible || !value.trim()) return;

    const fetchId = ++fetchIdRef.current;

    api
      .getAutocompleteSuggestions(value, cursorPosition)
      .then((response) => {
        if (fetchId === fetchIdRef.current) {
          setSuggestions(response.suggestions);
          setSelectedIndex(0);
        }
      })
      .catch(() => {
        if (fetchId === fetchIdRef.current) setSuggestions([]);
      });
  }, [value, cursorPosition, visible]);

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      const lines = value.split('\n');
      let charCount = 0;
      let lineIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= cursorPosition) {
          lineIndex = i;
          break;
        }
        charCount += lines[i].length + 1;
      }

      const currentLine = lines[lineIndex];
      const posInLine = cursorPosition - charCount;

      const beforeCursor = currentLine.slice(0, posInLine);
      const words = beforeCursor.split(' ');
      const lastWord = words[words.length - 1];

      const newLine =
        currentLine.slice(0, posInLine - lastWord.length) +
        suggestion.text +
        currentLine.slice(posInLine);
      lines[lineIndex] = newLine;

      const newValue = lines.join('\n');
      const newCursorPosition = cursorPosition - lastWord.length + suggestion.text.length;

      onSelect(newValue, newCursorPosition);
      onClose();
    },
    [value, cursorPosition, onSelect, onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || !suggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          handleSelect(suggestions[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [visible, suggestions, selectedIndex, handleSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const loading = suggestions === null;

  if (!visible || (!loading && suggestions.length === 0)) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'movement':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'turn':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'wait':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'motor':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'control':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'sensor':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'distance':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
      case 'angle':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
      case 'duration':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        ↑↓ navigate • Tab/Enter select • Esc close
      </div>
      {loading ? (
        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <ul className="max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className={`
                px-3 py-2 cursor-pointer flex items-center justify-between
                ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
              `}
            >
              <div>
                <div className="text-sm font-mono text-gray-800 dark:text-white">
                  {suggestion.text}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{suggestion.label}</div>
              </div>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(suggestion.category)}`}
              >
                {suggestion.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
