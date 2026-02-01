import type { Defaults } from '../../types';

export interface PathPoint {
  x: number;
  y: number;
  angle: number; // in degrees, 0 = facing right, 90 = facing down
  timestamp: number; // estimated time in ms
}

export interface PathSegment {
  type: 'straight' | 'turn' | 'wait';
  startPoint: PathPoint;
  endPoint: PathPoint;
  command: string;
}

export interface CalculatedPath {
  segments: PathSegment[];
  totalTime: number;
  endPosition: PathPoint;
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Normalize angle to 0-360 range
function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

export function calculatePath(
  commands: string[],
  startPosition: PathPoint,
  defaults: Defaults
): CalculatedPath {
  const segments: PathSegment[] = [];
  let currentPosition = { ...startPosition };
  let totalTime = 0;

  for (const command of commands) {
    const segment = parseCommandToSegment(command, currentPosition, defaults);
    if (segment) {
      segment.startPoint.timestamp = totalTime;
      totalTime += segment.endPoint.timestamp - segment.startPoint.timestamp;
      segment.endPoint.timestamp = totalTime;
      segments.push(segment);
      currentPosition = { ...segment.endPoint };
    }
  }

  return {
    segments,
    totalTime,
    endPosition: currentPosition,
  };
}

function parseCommandToSegment(
  command: string,
  startPoint: PathPoint,
  defaults: Defaults
): PathSegment | null {
  // Parse robot.straight(distance)
  const straightMatch = command.match(/robot\.straight\((-?\d+(?:\.\d+)?)\)/);
  if (straightMatch) {
    const distance = parseFloat(straightMatch[1]);
    return calculateStraightSegment(startPoint, distance, defaults, command);
  }

  // Parse robot.turn(angle)
  const turnMatch = command.match(/robot\.turn\((-?\d+(?:\.\d+)?)\)/);
  if (turnMatch) {
    const angle = parseFloat(turnMatch[1]);
    return calculateTurnSegment(startPoint, angle, defaults, command);
  }

  // Parse wait(duration)
  const waitMatch = command.match(/wait\((\d+(?:\.\d+)?)\)/);
  if (waitMatch) {
    const duration = parseFloat(waitMatch[1]);
    return calculateWaitSegment(startPoint, duration, command);
  }

  return null;
}

function calculateStraightSegment(
  startPoint: PathPoint,
  distance: number,
  defaults: Defaults,
  command: string
): PathSegment {
  // Scale factor: convert mm to pixels (approximate)
  const scale = 0.5; // 1mm = 0.5 pixels

  // Calculate end position based on current angle
  // Note: in our coordinate system, angle 0 = facing up (negative Y)
  const angleRad = toRadians(startPoint.angle - 90); // Adjust so 0 = up
  const dx = distance * scale * Math.cos(angleRad);
  const dy = distance * scale * Math.sin(angleRad);

  // Calculate time based on speed
  const time = Math.abs(distance) / defaults.speed * 1000; // in ms

  const endPoint: PathPoint = {
    x: startPoint.x + dx,
    y: startPoint.y + dy,
    angle: startPoint.angle,
    timestamp: startPoint.timestamp + time,
  };

  return {
    type: 'straight',
    startPoint: { ...startPoint },
    endPoint,
    command,
  };
}

function calculateTurnSegment(
  startPoint: PathPoint,
  angle: number,
  defaults: Defaults,
  command: string
): PathSegment {
  // Calculate time based on turn rate
  const time = Math.abs(angle) / defaults.turnRate * 1000; // in ms

  const endPoint: PathPoint = {
    x: startPoint.x,
    y: startPoint.y,
    angle: normalizeAngle(startPoint.angle + angle),
    timestamp: startPoint.timestamp + time,
  };

  return {
    type: 'turn',
    startPoint: { ...startPoint },
    endPoint,
    command,
  };
}

function calculateWaitSegment(
  startPoint: PathPoint,
  duration: number,
  command: string
): PathSegment {
  const endPoint: PathPoint = {
    ...startPoint,
    timestamp: startPoint.timestamp + duration,
  };

  return {
    type: 'wait',
    startPoint: { ...startPoint },
    endPoint,
    command,
  };
}

// Interpolate position at a given timestamp
export function getPositionAtTime(
  path: CalculatedPath,
  timestamp: number
): PathPoint {
  if (path.segments.length === 0) {
    return { x: 0, y: 0, angle: 0, timestamp: 0 };
  }

  // Find the segment that contains this timestamp
  for (const segment of path.segments) {
    if (timestamp >= segment.startPoint.timestamp && timestamp <= segment.endPoint.timestamp) {
      const progress = (timestamp - segment.startPoint.timestamp) /
        (segment.endPoint.timestamp - segment.startPoint.timestamp);

      return {
        x: segment.startPoint.x + (segment.endPoint.x - segment.startPoint.x) * progress,
        y: segment.startPoint.y + (segment.endPoint.y - segment.startPoint.y) * progress,
        angle: interpolateAngle(segment.startPoint.angle, segment.endPoint.angle, progress),
        timestamp,
      };
    }
  }

  // After all segments, return end position
  return path.endPosition;
}

function interpolateAngle(start: number, end: number, progress: number): number {
  // Handle angle wraparound
  let diff = end - start;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return normalizeAngle(start + diff * progress);
}

// Generate points along the path for visualization
export function generatePathPoints(
  path: CalculatedPath,
  pointsPerSegment: number = 20
): PathPoint[] {
  const points: PathPoint[] = [];

  for (const segment of path.segments) {
    const duration = segment.endPoint.timestamp - segment.startPoint.timestamp;

    for (let i = 0; i <= pointsPerSegment; i++) {
      const progress = i / pointsPerSegment;
      const timestamp = segment.startPoint.timestamp + duration * progress;
      points.push(getPositionAtTime(path, timestamp));
    }
  }

  return points;
}
