import { useCallback, useState } from 'react';

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
