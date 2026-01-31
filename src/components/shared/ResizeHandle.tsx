import { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos(direction === 'vertical' ? e.clientY : e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const currentPos = direction === 'vertical' ? e.clientY : e.clientX;
      const delta = currentPos - startPos;
      onResize(delta);
      setStartPos(currentPos);
    },
    [isDragging, startPos, direction, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        ${direction === 'vertical' ? 'h-2 cursor-row-resize' : 'w-2 cursor-col-resize'}
        bg-gray-200 hover:bg-blue-300 transition-colors
        flex items-center justify-center
        ${isDragging ? 'bg-blue-400' : ''}
      `}
    >
      <div className={`
        ${direction === 'vertical' ? 'w-8 h-0.5' : 'h-8 w-0.5'}
        bg-gray-400
      `} />
    </div>
  );
}
