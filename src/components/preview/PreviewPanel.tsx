import { useRef } from 'react';
import { usePreviewStore } from '../../stores/previewStore';
import { ResizeHandle } from '../shared/ResizeHandle';

export function PreviewPanel() {
  const {
    isOpen,
    width,
    fieldImage,
    startPosition,
    isPlaying,
    playbackSpeed,
    estimatedTime,
    setIsOpen,
    setWidth,
    setFieldImage,
    setIsPlaying,
    setPlaybackSpeed,
    reset,
  } = usePreviewStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFieldImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-6 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 flex items-center justify-center"
        title="Open Preview"
      >
        <span className="text-gray-500">◀</span>
      </button>
    );
  }

  return (
    <>
      <ResizeHandle
        direction="horizontal"
        onResize={(delta) => setWidth(width - delta)}
      />
      <aside style={{ width }} className="bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <span className="text-sm font-semibold">Preview</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            x
          </button>
        </div>

        <div className="flex-1 p-2 overflow-hidden">
          <div
            className="w-full h-64 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden"
            style={{
              backgroundImage: fieldImage ? `url(${fieldImage})` : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {!fieldImage && (
              <span className="text-gray-400 text-sm">No field image loaded</span>
            )}

            {/* Robot start position */}
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full"
              style={{
                left: startPosition.x,
                top: startPosition.y,
                transform: `rotate(${startPosition.angle}deg)`,
              }}
            >
              <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-blue-700 -translate-x-1/2 -translate-y-full" />
            </div>

            {/* Path visualization would go here */}
          </div>
        </div>

        <div className="p-2 border-t border-gray-200 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={reset}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
            >
              Reset
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-1 py-1 border border-gray-300 rounded text-xs"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>

          <div className="text-xs text-gray-600">
            Estimated time: {estimatedTime.toFixed(1)}s
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleLoadImage}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
            >
              Load Map
            </button>
            <button className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded">
              Set Start
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="p-2 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-700">
          Path-only preview. Sensors require real robot.
        </div>
      </aside>
    </>
  );
}
