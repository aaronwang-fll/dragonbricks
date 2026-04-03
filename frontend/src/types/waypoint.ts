/** Point on the field in millimeters */
export interface FieldPoint {
  x: number;
  y: number;
}

/** Robot pose: position + heading angle in degrees (0 = east, CCW positive) */
export interface RobotPose {
  x: number;
  y: number;
  angle: number;
}

/** A user-placed waypoint on the field */
export interface Waypoint {
  id: string;
  name: string;
  position: FieldPoint;
  /** Heading in degrees, null = auto-calculate from adjacent waypoints */
  heading: number | null;
  isPause: boolean;
  pauseMs: number;
}

/** Rectangular obstacle on the field */
export interface Obstacle {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPreset: boolean;
}

/** Robot physical dimensions in mm */
export interface RobotSize {
  width: number;
  length: number;
}

/** A single path segment between consecutive poses */
export interface PathSegment {
  type: 'straight' | 'curve' | 'turn' | 'wait';
  /** Distance in mm for straight, radius in mm for curve, angle in deg for turn, ms for wait */
  value: number;
  /** Arc angle in degrees (only for curve segments) */
  arcAngle?: number;
  /** Sampled points along this segment for rendering */
  points: FieldPoint[];
  startPose: RobotPose;
  endPose: RobotPose;
}

/** Result of path planning */
export interface ComputedPath {
  segments: PathSegment[];
  totalDistance: number;
  hasCollision: boolean;
  collidingObstacleIds: string[];
}

/** Active tool in the waypoint editor */
export type WaypointTool = 'select' | 'waypoint' | 'pause' | 'obstacle';

/** What the user is currently dragging */
export type DragTarget =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'start-rotate' }
  | { type: 'end-rotate' }
  | { type: 'waypoint'; id: string }
  | { type: 'obstacle'; id: string }
  | null;
