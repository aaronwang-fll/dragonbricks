import { useRef, useState, useEffect, useCallback } from 'react';
import { FIELD } from '../../lib/waypoint/fieldData';

interface CropImageDialogProps {
  imageDataUrl: string;
  onApply: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const VIEWPORT_WIDTH = 700;
const FIELD_ASPECT = FIELD.matWidth / FIELD.matHeight;
const VIEWPORT_HEIGHT = Math.round(VIEWPORT_WIDTH / FIELD_ASPECT);

export function CropImageDialog({ imageDataUrl, onApply, onCancel }: CropImageDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Crop state: offset of the image relative to the viewport, and zoom
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);

  // Drag state
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;

      // Initial scale: fit-cover (fill the viewport, crop overflow)
      const scaleX = VIEWPORT_WIDTH / img.naturalWidth;
      const scaleY = VIEWPORT_HEIGHT / img.naturalHeight;
      const coverScale = Math.max(scaleX, scaleY);
      setScale(coverScale);

      // Center the image
      setOffsetX((VIEWPORT_WIDTH - img.naturalWidth * coverScale) / 2);
      setOffsetY((VIEWPORT_HEIGHT - img.naturalHeight * coverScale) / 2);
      setImgLoaded(true);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Draw preview
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Dark background for areas outside image
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // Draw the image at current offset/scale
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Border to show field bounds
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  }, [offsetX, offsetY, scale]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, draw]);

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetX, oy: offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffsetX(dragRef.current.ox + dx);
    setOffsetY(dragRef.current.oy + dy);
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const img = imgRef.current;
    if (!img) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Mouse position in viewport
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.05, Math.min(10, scale * zoomFactor));

    // Zoom toward mouse position
    const newOffsetX = mx - (mx - offsetX) * (newScale / scale);
    const newOffsetY = my - (my - offsetY) * (newScale / scale);

    setScale(newScale);
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  };

  // Apply: render the visible viewport region at high resolution
  const handleApply = () => {
    const img = imgRef.current;
    if (!img) return;

    // What portion of the source image is visible in the viewport?
    // offsetX = left edge of drawn image in viewport coords
    // The viewport shows [0, VIEWPORT_WIDTH] x [0, VIEWPORT_HEIGHT]
    // In source image pixels: srcX = -offsetX / scale, srcY = -offsetY / scale
    const srcX = -offsetX / scale;
    const srcY = -offsetY / scale;
    const srcW = VIEWPORT_WIDTH / scale;
    const srcH = VIEWPORT_HEIGHT / scale;

    // Render at the field aspect ratio with good resolution
    const outW = Math.min(img.naturalWidth, 2362);
    const outH = Math.round(outW / FIELD_ASPECT);

    const offscreen = document.createElement('canvas');
    offscreen.width = outW;
    offscreen.height = outH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e4d2b';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    onApply(offscreen.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-[800px] w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Crop Field Image
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Drag to pan, scroll to zoom. Position the field mat within the frame.
        </p>

        <div
          className="mx-auto border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={VIEWPORT_WIDTH}
            height={VIEWPORT_HEIGHT}
            className="block"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            {Math.round(scale * 100)}% zoom
          </span>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
