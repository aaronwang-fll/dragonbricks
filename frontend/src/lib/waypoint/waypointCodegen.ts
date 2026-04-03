import type { ComputedPath, PathSegment } from '../../types/waypoint';

interface CodegenConfig {
  leftMotorPort: string;
  rightMotorPort: string;
  wheelDiameter: number;
  axleTrack: number;
  speed: number;
  acceleration: number;
  turnRate: number;
  turnAcceleration: number;
}

const DEFAULT_CONFIG: CodegenConfig = {
  leftMotorPort: 'A',
  rightMotorPort: 'B',
  wheelDiameter: 56,
  axleTrack: 112,
  speed: 200,
  acceleration: 700,
  turnRate: 150,
  turnAcceleration: 300,
};

/**
 * Generate the body code (no imports/setup) for a waypoint path.
 * Suitable for embedding in a routine.
 */
export function generateWaypointCode(path: ComputedPath): string {
  if (path.segments.length === 0) {
    return '# No path segments';
  }

  const lines: string[] = [];

  if (path.hasCollision) {
    lines.push('# WARNING: Path has potential collisions with obstacles');
    lines.push(`# Colliding obstacles: ${path.collidingObstacleIds.join(', ')}`);
    lines.push('');
  }

  lines.push(`# Waypoint path - total distance: ${path.totalDistance}mm`);

  for (const segment of path.segments) {
    lines.push(segmentToCode(segment));
  }

  return lines.join('\n');
}

/**
 * Generate a complete Pybricks program for the waypoint path.
 */
export function generateWaypointProgram(
  path: ComputedPath,
  config: Partial<CodegenConfig> = {},
): string {
  const c = { ...DEFAULT_CONFIG, ...config };
  const lines: string[] = [];

  // Imports
  lines.push('from pybricks.hubs import PrimeHub');
  lines.push('from pybricks.pupdevices import Motor');
  lines.push('from pybricks.parameters import Port, Direction, Stop');
  lines.push('from pybricks.robotics import DriveBase');
  lines.push('from pybricks.tools import wait');
  lines.push('');

  // Setup
  lines.push('# Initialize hub and motors');
  lines.push('hub = PrimeHub()');
  lines.push(`left_motor = Motor(Port.${c.leftMotorPort}, Direction.COUNTERCLOCKWISE)`);
  lines.push(`right_motor = Motor(Port.${c.rightMotorPort})`);
  lines.push(
    `robot = DriveBase(left_motor, right_motor, wheel_diameter=${c.wheelDiameter}, axle_track=${c.axleTrack})`,
  );
  lines.push('');

  // Drive settings
  lines.push('# Drive settings');
  lines.push(
    `robot.settings(straight_speed=${c.speed}, straight_acceleration=${c.acceleration}, turn_rate=${c.turnRate}, turn_acceleration=${c.turnAcceleration})`,
  );
  lines.push('');

  // Path body
  lines.push('# Waypoint navigation');
  const body = generateWaypointCode(path);
  lines.push(body);

  return lines.join('\n');
}

/** Convert a single path segment to a Pybricks code line */
function segmentToCode(segment: PathSegment): string {
  switch (segment.type) {
    case 'straight':
      return `robot.straight(${Math.round(segment.value)})`;

    case 'curve':
      return `robot.curve(${Math.round(segment.value)}, ${Math.round(segment.arcAngle!)})`;

    case 'turn':
      return `robot.turn(${Math.round(segment.value)})`;

    case 'wait':
      return `wait(${Math.round(segment.value)})`;
  }
}
