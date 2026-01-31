import { useRef, useEffect, useCallback, useState } from 'react';
import { usePreviewStore } from '../../stores/previewStore';
import { useEditorStore } from '../../stores/editorStore';
import { ResizeHandle } from '../shared/ResizeHandle';
import { calculatePath, generatePathPoints, getPositionAtTime } from '../../lib/preview/pathCalculator';
import type { CalculatedPath, PathPoint } from '../../lib/preview/pathCalculator';

export function PreviewPanel() {
  const {
    isOpen,
    width,
    fieldImage,
    startPosition,
    isPlaying,
    playbackSpeed,
    setIsOpen,
    setWidth,
    setFieldImage,
    setIsPlaying,
    setPlaybackSpeed,
    setEstimatedTime,
    reset,
  } = usePreviewStore();

  const { commands, defaults } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  const [calculatedPath, setCalculatedPath] = useState<CalculatedPath | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);

  // Calculate path when commands change
  useEffect(() => {
    const pythonCommands = commands
      .filter(cmd => cmd.status === 'parsed' && cmd.pythonCode)
      .map(cmd => cmd.pythonCode as string);

    if (pythonCommands.length > 0) {
      const startWithTimestamp = { ...startPosition, timestamp: 0 };
      const path = calculatePath(pythonCommands, startWithTimestamp, defaults);
      setCalculatedPath(path);
      setPathPoints(generatePathPoints(path));
      setEstimatedTime(path.totalTime / 1000);
    } else {
      setCalculatedPath(null);
      setPathPoints([]);
      setEstimatedTime(0);
    }
  }, [commands, startPosition, defaults, setEstimatedTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !calculatedPath) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let startTime: number | null = null;
    let pausedTime = currentTime;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const elapsed = (timestamp - startTime) * playbackSpeed;
      const newTime = pausedTime + elapsed;

      if (newTime >= calculatedPath.totalTime) {
        setCurrentTime(calculatedPath.totalTime);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(newTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, calculatedPath, playbackSpeed, currentTime, setIsPlaying]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw field image if available
    if (fieldImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawPath(ctx);
      };
      img.src = fieldImage;
    } else {
      // Draw grid
      drawGrid(ctx, canvas.width, canvas.height);
      drawPath(ctx);
    }

    function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      // Draw vertical lines
      for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    function drawPath(ctx: CanvasRenderingContext2D) {
      if (pathPoints.length < 2) return;

      // Draw path line
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw start position
      drawRobot(ctx, { ...startPosition, timestamp: 0 }, '#22c55e'); // green

      // Draw current position if playing
      if (calculatedPath && currentTime > 0) {
        const currentPos = getPositionAtTime(calculatedPath, currentTime);
        drawRobot(ctx, currentPos, '#3b82f6'); // blue
      }

      // Draw end position
      if (calculatedPath) {
        drawRobot(ctx, calculatedPath.endPosition, '#ef4444'); // red
      }
    }

    function drawRobot(ctx: CanvasRenderingContext2D, pos: PathPoint, color: string) {
      const size = 12;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate((pos.angle - 90) * Math.PI / 180); // Adjust for coordinate system

      // Draw robot body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7, size * 0.7);
      ctx.lineTo(-size * 0.7, size * 0.7);
      ctx.closePath();
      ctx.fill();

      // Draw direction indicator
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 0.6);
      ctx.stroke();

      ctx.restore();
    }
  }, [pathPoints, startPosition, calculatedPath, currentTime, fieldImage]);

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

  const handleReset = useCallback(() => {
    setCurrentTime(0);
    reset();
  }, [reset]);

  const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    return seconds.toFixed(1) + 's';
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
          <canvas
            ref={canvasRef}
            width={width - 20}
            height={250}
            className="w-full bg-gray-50 rounded border border-gray-200"
          />

          {/* Timeline */}
          {calculatedPath && calculatedPath.totalTime > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(calculatedPath.totalTime)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={calculatedPath.totalTime}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>

        <div className="p-2 border-t border-gray-200 space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!calculatedPath || calculatedPath.totalTime === 0}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs rounded"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleReset}
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
              <option value={4}>4x</option>
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleLoadImage}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
            >
              Load Map
            </button>
            {fieldImage && (
              <button
                onClick={() => setFieldImage(null)}
                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs rounded"
              >
                Clear Map
              </button>
            )}
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

        {/* Legend */}
        <div className="p-2 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Start
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span> End
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
