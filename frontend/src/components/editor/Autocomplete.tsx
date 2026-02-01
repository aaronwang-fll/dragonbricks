import { useCallback, useEffect, useState } from 'react';
import { getSuggestions, applySuggestion } from '../../lib/autocomplete/suggestions';
import type { Suggestion } from '../../lib/autocomplete/suggestions';

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (visible) {
      const newSuggestions = getSuggestions(value, cursorPosition);
      setSuggestions(newSuggestions);
      setSelectedIndex(0);
    }
  }, [value, cursorPosition, visible]);

  const handleSelect = useCallback((suggestion: Suggestion) => {
    const { newText, newCursorPosition } = applySuggestion(value, cursorPosition, suggestion);
    onSelect(newText, newCursorPosition);
    onClose();
  }, [value, cursorPosition, onSelect, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!visible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
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
  }, [visible, suggestions, selectedIndex, handleSelect, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!visible || suggestions.length === 0) return null;

  const getCategoryColor = (category: Suggestion['category']) => {
    switch (category) {
      case 'movement':
        return 'bg-blue-100 text-blue-700';
      case 'turn':
        return 'bg-green-100 text-green-700';
      case 'wait':
        return 'bg-yellow-100 text-yellow-700';
      case 'motor':
        return 'bg-purple-100 text-purple-700';
      case 'control':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 border-b">
        ↑↓ navigate • Enter select • Esc close
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <li
            key={index}
            onClick={() => handleSelect(suggestion)}
            className={`
              px-3 py-2 cursor-pointer flex items-center justify-between
              ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
            `}
          >
            <div>
              <div className="text-sm font-mono">{suggestion.displayText}</div>
              <div className="text-xs text-gray-500">{suggestion.description}</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getCategoryColor(suggestion.category)}`}>
              {suggestion.category}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Hook for managing autocomplete state
export function useAutocomplete() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const showAutocomplete = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  const hideAutocomplete = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    position,
    showAutocomplete,
    hideAutocomplete,
  };
}
