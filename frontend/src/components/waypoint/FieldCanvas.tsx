import { useRef, useEffect, useCallback, useState } from 'react';
import { useWaypointStore } from '../../stores/waypointStore';
import { FIELD } from '../../lib/waypoint/fieldData';
import type { FieldPoint, DragTarget, RobotPose } from '../../types/waypoint';
import defaultFieldImg from '../../assets/fll-unearthed-field.jpg';

const WAYPOINT_RADIUS = 12;
const HIT_RADIUS = 16;
const ROT_HANDLE_DIST_MM = 40;
const ROT_HANDLE_R = 7;
const RULER_MARGIN = 40;
const WALL_SNAP_MM = 20;
const ANGLE_SNAP_DEG = 45;
const ANGLE_SNAP_THRESHOLD = 6; // snap when within 6° of a 45° multiple

function distSq(a: FieldPoint, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function snapAngle(deg: number): number {
  const nearest = Math.round(deg / ANGLE_SNAP_DEG) * ANGLE_SNAP_DEG;
  return Math.abs(deg - nearest) <= ANGLE_SNAP_THRESHOLD ? nearest : Math.round(deg);
}

// Semi-circle snap lines (mm) — vertical and horizontal edges of the launch area semi-circles
const SNAP_LINES_X = [257, 2033]; // left and right vertical lines
const SNAP_LINES_Y = [1018]; // horizontal line (top of semi-circles)
const LINE_SNAP_MM = 15; // snap threshold for semi-circle lines

/** Snap a value to the nearest snap line if within threshold, using the robot's bounding-box edge. */
function snapToLines(
  center: number,
  halfExtent: number,
  lines: readonly number[],
  threshold: number,
): number {
  for (const line of lines) {
    // Snap left/top edge of bounding box to line
    const leftEdge = center - halfExtent;
    if (Math.abs(leftEdge - line) <= threshold) return line + halfExtent;
    // Snap right/bottom edge of bounding box to line
    const rightEdge = center + halfExtent;
    if (Math.abs(rightEdge - line) <= threshold) return line - halfExtent;
  }
  return center;
}

/** Clamp robot pose so its rotated bounding box stays inside the field, snapping to walls and semi-circle lines. */
function clampRobotToField(
  x: number,
  y: number,
  angle: number,
  robotW: number,
  robotL: number,
): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  const halfBBW = (robotL * cosA + robotW * sinA) / 2;
  const halfBBH = (robotL * sinA + robotW * cosA) / 2;

  let nx = x;
  let ny = y;

  // Wall snap + hard clamp
  if (nx - halfBBW < WALL_SNAP_MM) nx = halfBBW;
  else if (nx + halfBBW > FIELD.matWidth - WALL_SNAP_MM) nx = FIELD.matWidth - halfBBW;
  nx = Math.max(halfBBW, Math.min(FIELD.matWidth - halfBBW, nx));

  if (ny - halfBBH < WALL_SNAP_MM) ny = halfBBH;
  else if (ny + halfBBH > FIELD.matHeight - WALL_SNAP_MM) ny = FIELD.matHeight - halfBBH;
  ny = Math.max(halfBBH, Math.min(FIELD.matHeight - halfBBH, ny));

  // Snap bounding-box edges to semi-circle lines
  nx = snapToLines(nx, halfBBW, SNAP_LINES_X, LINE_SNAP_MM);
  ny = snapToLines(ny, halfBBH, SNAP_LINES_Y, LINE_SNAP_MM);

  return { x: Math.round(nx), y: Math.round(ny) };
}

function clampPoint(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(FIELD.matWidth, x))),
    y: Math.round(Math.max(0, Math.min(FIELD.matHeight, y))),
  };
}

function clampObstacle(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(FIELD.matWidth - w, x))),
    y: Math.round(Math.max(0, Math.min(FIELD.matHeight - h, y))),
  };
}

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldImgRef = useRef<HTMLImageElement | null>(null);
  const mousePosRef = useRef<{ cx: number; cy: number } | null>(null);
  const obsDragOffsetRef = useRef<FieldPoint | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [imageReady, setImageReady] = useState(false);

  const {
    startPose,
    endPose,
    waypoints,
    obstacles,
    robotSize,
    computedPath,
    activeTool,
    dragTarget,
    selectedId,
    zoom,
    panOffset,
    fieldImageDataUrl,
    setStartPose,
    setEndPose,
    addWaypoint,
    updateWaypoint,
    addObstacle,
    updateObstacle,
    setDragTarget,
    setSelectedId,
    setActiveTool,
  } = useWaypointStore();

  // ── Escape key returns to Select tool ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTool('select');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTool]);

  // ── Load field image (user-uploaded or bundled default) ──
  useEffect(() => {
    const src = fieldImageDataUrl || defaultFieldImg;
    const img = new Image();
    img.onload = () => {
      fieldImgRef.current = img;
      setImageReady(true);
    };
    img.onerror = () => {
      fieldImgRef.current = null;
      setImageReady(true);
    };
    img.src = src;
  }, [fieldImageDataUrl]);

  // ── ResizeObserver ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Coordinate transforms ──
  const scale =
    Math.min(
      (canvasSize.width - RULER_MARGIN * 2) / FIELD.matWidth,
      (canvasSize.height - RULER_MARGIN * 2) / FIELD.matHeight,
    ) * zoom;

  const offsetX =
    panOffset.x + RULER_MARGIN + (canvasSize.width - RULER_MARGIN * 2 - FIELD.matWidth * scale) / 2;
  const offsetY =
    panOffset.y +
    RULER_MARGIN +
    (canvasSize.height - RULER_MARGIN * 2 - FIELD.matHeight * scale) / 2;

  const toCanvas = useCallback(
    (p: FieldPoint): FieldPoint => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }),
    [scale, offsetX, offsetY],
  );
  const toField = useCallback(
    (p: FieldPoint): FieldPoint => ({ x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale }),
    [scale, offsetX, offsetY],
  );

  const rotHandleMm = useCallback(
    (pose: RobotPose): FieldPoint => {
      const dist = robotSize.length / 2 + ROT_HANDLE_DIST_MM;
      const rad = (pose.angle * Math.PI) / 180;
      return { x: pose.x + Math.cos(rad) * dist, y: pose.y + Math.sin(rad) * dist };
    },
    [robotSize.length],
  );

  // ══════════════════════════════════════════════════════════
  //  DRAWING
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawField(ctx);
    drawDimensions(ctx);
    drawHomeArea(ctx);
    for (const obs of obstacles) drawObstacle(ctx, obs);
    if (computedPath) drawPath(ctx);
    for (let i = 0; i < waypoints.length; i++) drawWaypoint(ctx, waypoints[i], i);
    drawRobotPose(ctx, startPose, '#22c55e', 'S');
    drawRobotPose(ctx, endPose, '#ef4444', 'E');
    if (dragTarget && mousePosRef.current) drawDragTooltip(ctx, dragTarget, mousePosRef.current);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasSize,
    startPose,
    endPose,
    waypoints,
    obstacles,
    computedPath,
    selectedId,
    zoom,
    panOffset,
    scale,
    dragTarget,
    robotSize,
    imageReady,
  ]);

  function drawField(ctx: CanvasRenderingContext2D) {
    const tl = toCanvas({ x: 0, y: 0 });
    const fieldW = FIELD.matWidth * scale;
    const fieldH = FIELD.matHeight * scale;
    const hasImage = !!fieldImgRef.current;

    if (hasImage) {
      // Stretch image to fill the field rectangle (the image IS the field mat)
      const img = fieldImgRef.current!;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, tl.x, tl.y, fieldW, fieldH);
    } else {
      ctx.fillStyle = '#1e4d2b';
      ctx.fillRect(tl.x, tl.y, fieldW, fieldH);
    }

    // Grid 100mm
    ctx.strokeStyle = hasImage ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= FIELD.matWidth; x += 100) {
      const p1 = toCanvas({ x, y: 0 });
      const p2 = toCanvas({ x, y: FIELD.matHeight });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.matHeight; y += 100) {
      const p1 = toCanvas({ x: 0, y });
      const p2 = toCanvas({ x: FIELD.matWidth, y });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Major grid 500mm
    ctx.strokeStyle = hasImage ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.7;
    for (let x = 0; x <= FIELD.matWidth; x += 500) {
      const p1 = toCanvas({ x, y: 0 });
      const p2 = toCanvas({ x, y: FIELD.matHeight });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.matHeight; y += 500) {
      const p1 = toCanvas({ x: 0, y });
      const p2 = toCanvas({ x: FIELD.matWidth, y });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, fieldW, fieldH);
  }

  function drawDimensions(ctx: CanvasRenderingContext2D) {
    const tl = toCanvas({ x: 0, y: 0 });
    const br = toCanvas({ x: FIELD.matWidth, y: FIELD.matHeight });
    ctx.fillStyle = '#9ca3af';
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 0.5;

    // Top ruler
    const topY = tl.y - 10;
    ctx.beginPath();
    ctx.moveTo(tl.x, topY);
    ctx.lineTo(br.x, topY);
    ctx.stroke();
    for (const ex of [tl.x, br.x]) {
      ctx.beginPath();
      ctx.moveTo(ex, topY - 5);
      ctx.lineTo(ex, topY + 5);
      ctx.stroke();
    }
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = 0; x <= FIELD.matWidth; x += 200) {
      const cx = toCanvas({ x, y: 0 }).x;
      const isMajor = x % 400 === 0;
      ctx.beginPath();
      ctx.moveTo(cx, topY - (isMajor ? 4 : 2));
      ctx.lineTo(cx, topY + (isMajor ? 4 : 2));
      ctx.stroke();
      if (isMajor && x > 0 && x < FIELD.matWidth) ctx.fillText(`${x}`, cx, topY - 5);
    }
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText(`${FIELD.matWidth} mm`, (tl.x + br.x) / 2, topY - 14);

    // Left ruler
    const leftX = tl.x - 10;
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(leftX, tl.y);
    ctx.lineTo(leftX, br.y);
    ctx.stroke();
    for (const ey of [tl.y, br.y]) {
      ctx.beginPath();
      ctx.moveTo(leftX - 5, ey);
      ctx.lineTo(leftX + 5, ey);
      ctx.stroke();
    }
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= FIELD.matHeight; y += 200) {
      const cy = toCanvas({ x: 0, y }).y;
      const isMajor = y % 400 === 0;
      ctx.beginPath();
      ctx.moveTo(leftX - (isMajor ? 4 : 2), cy);
      ctx.lineTo(leftX + (isMajor ? 4 : 2), cy);
      ctx.stroke();
      if (isMajor && y > 0 && y < FIELD.matHeight) ctx.fillText(`${y}`, leftX - 6, cy);
    }
    ctx.save();
    ctx.translate(leftX - 22, (tl.y + br.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText(`${FIELD.matHeight} mm`, 0, 0);
    ctx.restore();
  }

  function drawHomeArea(ctx: CanvasRenderingContext2D) {
    const tl = toCanvas({ x: 0, y: 0 });
    const br = toCanvas({ x: FIELD.homeAreaWidth, y: FIELD.matHeight });
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.font = `${Math.max(10, 12 * zoom)}px sans-serif`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'top';
    ctx.fillText('HOME', tl.x + 4, tl.y + 4);
  }

  function drawObstacle(
    ctx: CanvasRenderingContext2D,
    obs: { id: string; name: string; x: number; y: number; width: number; height: number },
  ) {
    const tl = toCanvas({ x: obs.x, y: obs.y });
    const w = obs.width * scale;
    const h = obs.height * scale;
    const isColliding = computedPath?.collidingObstacleIds.includes(obs.id);
    const isSelected = selectedId === obs.id;

    ctx.fillStyle = isColliding ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.2)';
    ctx.fillRect(tl.x, tl.y, w, h);
    ctx.strokeStyle = isColliding ? '#ef4444' : isSelected ? '#3b82f6' : 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = isColliding ? 2 : 1;
    ctx.strokeRect(tl.x, tl.y, w, h);
    ctx.fillStyle = isColliding ? '#fca5a5' : '#fbbf24';
    ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'bottom';
    ctx.fillText(obs.name, tl.x + 2, tl.y - 3);
  }

  function drawPath(ctx: CanvasRenderingContext2D) {
    if (!computedPath) return;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    for (const seg of computedPath.segments) {
      if (seg.points.length < 2) continue;
      ctx.beginPath();
      const first = toCanvas(seg.points[0]);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < seg.points.length; i++) {
        const p = toCanvas(seg.points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  function drawWaypoint(
    ctx: CanvasRenderingContext2D,
    wp: { id: string; name: string; position: FieldPoint; isPause: boolean },
    index: number,
  ) {
    const cp = toCanvas(wp.position);
    const isSelected = selectedId === wp.id;
    const r = WAYPOINT_RADIUS * zoom;

    ctx.beginPath();
    ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
    ctx.fillStyle = wp.isPause ? '#f97316' : '#3b82f6';
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Number inside circle
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, 11 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), cp.x, cp.y);

    // Name label below circle
    const label = wp.name || (wp.isPause ? `Pause ${index + 1}` : `WP ${index + 1}`);
    ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.fillStyle = wp.isPause ? '#f97316' : '#60a5fa';
    ctx.textBaseline = 'top';
    ctx.fillText(label, cp.x, cp.y + r + 3);

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  function drawRobotPose(
    ctx: CanvasRenderingContext2D,
    pose: RobotPose,
    color: string,
    label: string,
  ) {
    const cp = toCanvas({ x: pose.x, y: pose.y });
    const w = robotSize.width * scale;
    const l = robotSize.length * scale;
    const angleRad = (pose.angle * Math.PI) / 180;
    const isStart = label === 'S';
    const isRotating = dragTarget?.type === (isStart ? 'start-rotate' : 'end-rotate');
    const isDragging = dragTarget?.type === (isStart ? 'start' : 'end');

    if (isRotating) {
      const orbitR = (robotSize.length / 2 + ROT_HANDLE_DIST_MM) * scale;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color + '30';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(cp.x, cp.y);
    ctx.rotate(angleRad);

    // Body fill
    ctx.fillStyle = color + '30';
    ctx.fillRect(-l / 2, -w / 2, l, w);

    // Front edge — thick solid bar to mark the front
    ctx.fillStyle = color;
    ctx.fillRect(l / 2 - 4 * zoom, -w / 2, 4 * zoom, w);

    // Back edge — striped/dashed to distinguish from front
    ctx.fillStyle = color + '60';
    ctx.fillRect(-l / 2, -w / 2, 2 * zoom, w);

    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = isDragging || isRotating ? 2.5 : 1.5;
    ctx.strokeRect(-l / 2, -w / 2, l, w);

    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, 3 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Direction arrow extending from front
    ctx.beginPath();
    ctx.moveTo(l / 2 + 3 * zoom, 0);
    ctx.lineTo(l / 2 + 14 * zoom, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(l / 2 + 14 * zoom, 0);
    ctx.lineTo(l / 2 + 9 * zoom, -4 * zoom);
    ctx.lineTo(l / 2 + 9 * zoom, 4 * zoom);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Label inside robot body
    if (zoom >= 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `bold ${Math.max(9, 11 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, -l / 6, 0);
    }

    if (zoom >= 0.7) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `${Math.max(7, 9 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${robotSize.length}`, 0, -w / 2 - 2);
      ctx.save();
      ctx.translate(-l / 2 - 3, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${robotSize.width}`, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    // Rotation handle
    const handleMm = rotHandleMm(pose);
    const hc = toCanvas(handleMm);
    const frontMm: FieldPoint = {
      x: pose.x + Math.cos(angleRad) * (robotSize.length / 2),
      y: pose.y + Math.sin(angleRad) * (robotSize.length / 2),
    };
    const fc = toCanvas(frontMm);

    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color + '70';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fc.x, fc.y);
    ctx.lineTo(hc.x, hc.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(hc.x, hc.y, ROT_HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = isRotating ? color : color + 'bb';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hc.x, hc.y, 3.5, -0.3, 2.2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = `bold ${Math.max(9, 10 * zoom)}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(pose.angle)}°`, hc.x, hc.y - ROT_HANDLE_R - 3);

    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(10, 12 * zoom)}px sans-serif`;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, cp.x + l / 2 + 14 * zoom, cp.y - w / 2 - 2);
  }

  function drawDragTooltip(
    ctx: CanvasRenderingContext2D,
    target: NonNullable<DragTarget>,
    mouse: { cx: number; cy: number },
  ) {
    let text = '';
    if (target.type === 'start') text = `(${Math.round(startPose.x)}, ${Math.round(startPose.y)})`;
    else if (target.type === 'end') text = `(${Math.round(endPose.x)}, ${Math.round(endPose.y)})`;
    else if (target.type === 'start-rotate') text = `${Math.round(startPose.angle)}°`;
    else if (target.type === 'end-rotate') text = `${Math.round(endPose.angle)}°`;
    else if (target.type === 'waypoint') {
      const wp = waypoints.find((w) => w.id === target.id);
      if (wp) text = `(${Math.round(wp.position.x)}, ${Math.round(wp.position.y)})`;
    } else if (target.type === 'obstacle') {
      const obs = obstacles.find((o) => o.id === target.id);
      if (obs) text = `(${Math.round(obs.x)}, ${Math.round(obs.y)})`;
    }
    if (!text) return;

    const px = mouse.cx + 16;
    const py = mouse.cy - 10;
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(px - 2, py - 18, tw, 20);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, px + 3, py);
  }

  // ══════════════════════════════════════════════════════════
  //  PANNING (left-click drag on empty space)
  // ══════════════════════════════════════════════════════════
  const { setPanOffset } = useWaypointStore();
  const panDragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(
    null,
  );

  // Scroll-wheel zoom centered on the middle of the canvas
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const { setZoom } = useWaypointStore.getState();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newZoom = Math.max(0.25, Math.min(4, zoom * zoomFactor));

      // Scale panOffset so the same field-center stays in view
      const ratio = newZoom / zoom;
      setPanOffset({
        x: panOffset.x * ratio,
        y: panOffset.y * ratio,
      });

      setZoom(newZoom);
    },
    [zoom, panOffset, setPanOffset],
  );

  // ══════════════════════════════════════════════════════════
  //  MOUSE INTERACTION
  // ══════════════════════════════════════════════════════════
  const dragStartRef = useRef<FieldPoint | null>(null);
  const obstacleDrawStartRef = useRef<FieldPoint | null>(null);

  const getMouseFieldPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): FieldPoint => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return toField({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [toField],
  );

  const getMouseCanvasPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { cx: number; cy: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
    },
    [],
  );

  const hitTest = useCallback(
    (pos: FieldPoint): DragTarget => {
      const hitR = HIT_RADIUS / scale;
      const rotHitR = (ROT_HANDLE_R + 6) / scale;

      if (distSq(pos, rotHandleMm(endPose)) < rotHitR * rotHitR) return { type: 'end-rotate' };
      if (distSq(pos, rotHandleMm(startPose)) < rotHitR * rotHitR) return { type: 'start-rotate' };

      for (let i = waypoints.length - 1; i >= 0; i--) {
        if (distSq(pos, waypoints[i].position) < hitR * hitR) {
          return { type: 'waypoint', id: waypoints[i].id };
        }
      }

      if (distSq(pos, endPose) < hitR * hitR * 4) return { type: 'end' };
      if (distSq(pos, startPose) < hitR * hitR * 4) return { type: 'start' };

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (
          pos.x >= obs.x &&
          pos.x <= obs.x + obs.width &&
          pos.y >= obs.y &&
          pos.y <= obs.y + obs.height
        ) {
          return { type: 'obstacle', id: obs.id };
        }
      }
      return null;
    },
    [waypoints, startPose, endPose, obstacles, scale, rotHandleMm],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMouseFieldPos(e);
      mousePosRef.current = getMouseCanvasPos(e);

      if (activeTool === 'select') {
        const target = hitTest(pos);
        if (target) {
          setDragTarget(target);
          dragStartRef.current = pos;
          setSelectedId('id' in target ? target.id : null);

          // Store offset for obstacle dragging
          if (target.type === 'obstacle') {
            const obs = obstacles.find((o) => o.id === target.id);
            if (obs) obsDragOffsetRef.current = { x: pos.x - obs.x, y: pos.y - obs.y };
          }
        } else {
          setSelectedId(null);
          // Start panning on empty space
          panDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            ox: panOffset.x,
            oy: panOffset.y,
          };
        }
      } else if (activeTool === 'waypoint' || activeTool === 'pause') {
        const clamped = clampPoint(pos.x, pos.y);
        const id = `wp-${Date.now()}`;
        const wpCount = waypoints.length + 1;
        addWaypoint({
          id,
          name: activeTool === 'pause' ? `Pause ${wpCount}` : `WP ${wpCount}`,
          position: clamped,
          heading: null,
          isPause: activeTool === 'pause',
          pauseMs: activeTool === 'pause' ? 1000 : 0,
        });
        setSelectedId(id);
      } else if (activeTool === 'obstacle') {
        obstacleDrawStartRef.current = pos;
      }
    },
    [
      activeTool,
      panOffset,
      getMouseFieldPos,
      getMouseCanvasPos,
      hitTest,
      addWaypoint,
      setDragTarget,
      setSelectedId,
      setActiveTool,
      waypoints.length,
      obstacles,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Panning
      if (panDragRef.current) {
        const dx = e.clientX - panDragRef.current.startX;
        const dy = e.clientY - panDragRef.current.startY;
        setPanOffset({ x: panDragRef.current.ox + dx, y: panDragRef.current.oy + dy });
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'grabbing';
        return;
      }

      const pos = getMouseFieldPos(e);
      mousePosRef.current = getMouseCanvasPos(e);

      if (dragTarget && dragStartRef.current) {
        if (dragTarget.type === 'start') {
          const clamped = clampRobotToField(
            pos.x,
            pos.y,
            startPose.angle,
            robotSize.width,
            robotSize.length,
          );
          setStartPose({ ...startPose, ...clamped });
        } else if (dragTarget.type === 'end') {
          const clamped = clampRobotToField(
            pos.x,
            pos.y,
            endPose.angle,
            robotSize.width,
            robotSize.length,
          );
          setEndPose({ ...endPose, ...clamped });
        } else if (dragTarget.type === 'start-rotate') {
          const raw = Math.atan2(pos.y - startPose.y, pos.x - startPose.x) * (180 / Math.PI);
          setStartPose({ ...startPose, angle: snapAngle(raw) });
        } else if (dragTarget.type === 'end-rotate') {
          const raw = Math.atan2(pos.y - endPose.y, pos.x - endPose.x) * (180 / Math.PI);
          setEndPose({ ...endPose, angle: snapAngle(raw) });
        } else if (dragTarget.type === 'waypoint') {
          const clamped = clampPoint(pos.x, pos.y);
          updateWaypoint(dragTarget.id, { position: clamped });
        } else if (dragTarget.type === 'obstacle') {
          const offset = obsDragOffsetRef.current;
          if (offset) {
            const obs = obstacles.find((o) => o.id === dragTarget.id);
            if (obs) {
              const clamped = clampObstacle(
                pos.x - offset.x,
                pos.y - offset.y,
                obs.width,
                obs.height,
              );
              updateObstacle(dragTarget.id, clamped);
            }
          }
        }

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor =
            dragTarget.type === 'start-rotate' || dragTarget.type === 'end-rotate'
              ? 'grabbing'
              : 'move';
        }
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          const target = hitTest(pos);
          if (!target) canvas.style.cursor = activeTool === 'select' ? 'default' : 'crosshair';
          else if (target.type === 'start-rotate' || target.type === 'end-rotate')
            canvas.style.cursor = 'grab';
          else canvas.style.cursor = 'move';
        }
      }
    },
    [
      dragTarget,
      startPose,
      endPose,
      robotSize,
      obstacles,
      setPanOffset,
      getMouseFieldPos,
      getMouseCanvasPos,
      setStartPose,
      setEndPose,
      updateWaypoint,
      updateObstacle,
      hitTest,
      activeTool,
    ],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panDragRef.current) {
        panDragRef.current = null;
        return;
      }

      if (activeTool === 'obstacle' && obstacleDrawStartRef.current) {
        const pos = getMouseFieldPos(e);
        const start = obstacleDrawStartRef.current;
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        const w = Math.abs(pos.x - start.x);
        const h = Math.abs(pos.y - start.y);

        if (w > 10 && h > 10) {
          const clamped = clampObstacle(x, y, w, h);
          const id = `obs-${Date.now()}`;
          addObstacle({
            id,
            name: 'Custom',
            x: clamped.x,
            y: clamped.y,
            width: Math.round(w),
            height: Math.round(h),
            isPreset: false,
          });
          setSelectedId(id);
          setActiveTool('select');
        }
        obstacleDrawStartRef.current = null;
      }

      setDragTarget(null);
      dragStartRef.current = null;
      obsDragOffsetRef.current = null;
      mousePosRef.current = null;
    },
    [activeTool, getMouseFieldPos, addObstacle, setDragTarget, setSelectedId, setActiveTool],
  );

  return (
    <div ref={containerRef} className="flex-1 bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ cursor: 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        onMouseLeave={() => {
          setDragTarget(null);
          dragStartRef.current = null;
          obsDragOffsetRef.current = null;
          panDragRef.current = null;
          mousePosRef.current = null;
        }}
      />
    </div>
  );
}
