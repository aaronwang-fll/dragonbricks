import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { usePreviewStore } from '../../stores/previewStore';
import { useEditorStore } from '../../stores/editorStore';
import { useThemeStore } from '../../stores/themeStore';
import { api } from '../../lib/api';
import type { PreviewPath, PreviewPathPoint } from '../../lib/api';

function getPointAtTime(
  points: PreviewPathPoint[],
  fallback: PreviewPathPoint,
  timestamp: number,
): PreviewPathPoint {
  if (points.length === 0) {
    return fallback;
  }

  for (const point of points) {
    if (point.timestamp >= timestamp) {
      return point;
    }
  }

  return fallback;
}

export function PreviewPanel() {
  const {
    isOpen,
    isExpanded,
    fieldImage,
    startPosition,
    isPlaying,
    playbackSpeed,
    estimatedTime,
    setIsOpen,
    setIsExpanded,
    setFieldImage,
    setIsPlaying,
    setPlaybackSpeed,
    setEstimatedTime,
    reset,
  } = usePreviewStore();

  const { commands, defaults } = useEditorStore();
  const { mode } = useThemeStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [calculatedPath, setCalculatedPath] = useState<PreviewPath | null>(null);
  const [pathPoints, setPathPoints] = useState<PreviewPathPoint[]>([]);

  const pythonCommands = useMemo(
    () =>
      commands
        .filter((cmd) => cmd.status === 'parsed' && cmd.pythonCode)
        .map((cmd) => cmd.pythonCode as string),
    [commands],
  );
  const startPointWithTimestamp = useMemo(
    () => ({ x: startPosition.x, y: startPosition.y, angle: startPosition.angle, timestamp: 0 }),
    [startPosition.x, startPosition.y, startPosition.angle],
  );

  // Fetch backend-calculated preview path.
  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (pythonCommands.length === 0) {
        setCalculatedPath(null);
        setPathPoints([]);
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }

      try {
        const preview = await api.calculatePreviewPath(pythonCommands, startPointWithTimestamp, {
          speed: defaults.speed || 200,
          turn_rate: defaults.turnRate || 150,
        });

        if (cancelled) {
          return;
        }

        setCalculatedPath(preview.path);
        setPathPoints(preview.points);
        setCurrentTime((previous) => Math.min(previous, preview.path.total_time));
      } catch {
        if (cancelled) {
          return;
        }
        setCalculatedPath(null);
        setPathPoints([]);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [pythonCommands, startPointWithTimestamp, defaults.speed, defaults.turnRate, setIsPlaying]);

  // Sync estimated time to store when path changes
  useEffect(() => {
    setEstimatedTime(calculatedPath ? calculatedPath.total_time : 0);
  }, [calculatedPath, setEstimatedTime]);

  // Theme-aware colors
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const colors = useMemo(
    () => ({
      grid: isDark ? '#374151' : '#e5e7eb',
      path: '#3b82f6',
      start: '#22c55e',
      current: '#3b82f6',
      end: '#ef4444',
    }),
    [isDark],
  );

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
    const pausedTime = currentTime;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const elapsed = (timestamp - startTime) * playbackSpeed;
      const newTime = pausedTime + elapsed;

      if (newTime >= calculatedPath.total_time) {
        setCurrentTime(calculatedPath.total_time);
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
      ctx.strokeStyle = colors.grid;
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
      ctx.strokeStyle = colors.path;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw start position
      drawRobot(ctx, { ...startPosition, timestamp: 0 }, colors.start);

      // Draw current position if playing
      if (calculatedPath && currentTime > 0) {
        const currentPos = getPointAtTime(pathPoints, calculatedPath.end_position, currentTime);
        drawRobot(ctx, currentPos, colors.current);
      }

      // Draw end position
      if (calculatedPath) {
        drawRobot(ctx, calculatedPath.end_position, colors.end);
      }
    }

    function drawRobot(ctx: CanvasRenderingContext2D, pos: PreviewPathPoint, color: string) {
      const size = 12;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(((pos.angle - 90) * Math.PI) / 180); // Adjust for coordinate system

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
  }, [pathPoints, startPosition, calculatedPath, currentTime, fieldImage, colors]);

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

  const formatEstimatedTime = (ms: number) => `~${(ms / 1000).toFixed(1)} sec`;

  const panelWidth = isExpanded ? 500 : 280;
  const canvasHeight = isExpanded ? 400 : 200;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center group relative"
      >
        <span className="text-gray-400 text-xs">◀</span>
        <span className="absolute right-10 px-2 py-1 bg-gray-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Open Preview
        </span>
      </button>
    );
  }

  return (
    <aside
      style={{ width: panelWidth }}
      className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300 uppercase">Preview</span>
          {estimatedTime > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {formatEstimatedTime(estimatedTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▶' : '◀'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Canvas - click to expand */}
      <div
        className="p-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand/collapse"
      >
        <canvas
          ref={canvasRef}
          width={panelWidth - 16}
          height={canvasHeight}
          className="w-full bg-gray-100 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
        />
      </div>

      {/* Controls - directly under canvas */}
      <div className="px-2 pb-2 space-y-2">
        {/* Timeline */}
        {calculatedPath && calculatedPath.total_time > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(calculatedPath.total_time)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={calculatedPath.total_time}
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Playback controls */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            disabled={!calculatedPath || calculatedPath.total_time === 0}
            className="w-7 h-7 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm rounded"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm rounded text-gray-700 dark:text-gray-200"
            title="Reset"
          >
            ⟲
          </button>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLoadImage();
            }}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-[10px] rounded text-gray-700 dark:text-gray-200"
          >
            {fieldImage ? 'Change Map' : 'Load Map'}
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

      {/* Legend - compact */}
      <div className="px-2 py-1.5 border-t border-gray-700 text-[10px] text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Start
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Now
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> End
          </span>
        </div>
        <span className="text-yellow-500">Path only</span>
      </div>
    </aside>
  );
}
