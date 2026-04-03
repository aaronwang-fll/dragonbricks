import type {
  RobotPose,
  Waypoint,
  Obstacle,
  RobotSize,
  ComputedPath,
  PathSegment,
  FieldPoint,
} from '../../types/waypoint';
import {
  degToRad,
  radToDeg,
  distance,
  angleBetween,
  normalizeAngle,
  sampleBezier,
  polylineIntersectsInflatedRect,
} from './geometry';

const SAMPLES_PER_SEGMENT = 50;
const STRAIGHT_THRESHOLD_DEG = 5;
const CURVATURE_TOLERANCE = 0.15;

/**
 * Plan a path through the given waypoints from start to end.
 * Returns computed path segments with collision information.
 */
export function planPath(
  start: RobotPose,
  end: RobotPose,
  waypoints: Waypoint[],
  obstacles: Obstacle[],
  robotSize: RobotSize,
): ComputedPath {
  // Build ordered pose list
  const poses = buildPoseList(start, end, waypoints);

  if (poses.length < 2) {
    return { segments: [], totalDistance: 0, hasCollision: false, collidingObstacleIds: [] };
  }

  // Auto-calculate headings for waypoints with null heading
  autoCalculateHeadings(poses);

  // Generate path segments between consecutive poses
  const segments: PathSegment[] = [];
  let totalDistance = 0;

  for (let i = 0; i < poses.length - 1; i++) {
    const from = poses[i];
    const to = poses[i + 1];

    // Check if this is a pause waypoint
    const waypointIndex = i - 1; // offset by 1 because start is at index 0
    const wp =
      waypointIndex >= 0 && waypointIndex < waypoints.length ? waypoints[waypointIndex] : null;

    if (wp?.isPause) {
      segments.push({
        type: 'wait',
        value: wp.pauseMs,
        points: [{ x: from.x, y: from.y }],
        startPose: { ...from },
        endPose: { ...from },
      });
    }

    // Fit Bezier between consecutive poses
    const bezierPoints = fitBezierBetweenPoses(from, to);

    // Decompose to Pybricks commands
    const decomposed = decomposeToPybricksSegments(from, to, bezierPoints);
    for (const seg of decomposed) {
      if (seg.type === 'straight') {
        totalDistance += seg.value;
      } else if (seg.type === 'curve' && seg.arcAngle !== undefined) {
        totalDistance += Math.abs(seg.value * degToRad(seg.arcAngle));
      }
    }
    segments.push(...decomposed);
  }

  // Collision detection
  const inflation = Math.max(robotSize.width, robotSize.length) / 2;
  const allPoints = segments.flatMap((s) => s.points);
  const collidingObstacleIds: string[] = [];

  for (const obs of obstacles) {
    if (polylineIntersectsInflatedRect(allPoints, obs.x, obs.y, obs.width, obs.height, inflation)) {
      collidingObstacleIds.push(obs.id);
    }
  }

  return {
    segments,
    totalDistance: Math.round(totalDistance),
    hasCollision: collidingObstacleIds.length > 0,
    collidingObstacleIds,
  };
}

/** Build ordered pose list: [start, ...waypoints, end] */
function buildPoseList(start: RobotPose, end: RobotPose, waypoints: Waypoint[]): RobotPose[] {
  const poses: RobotPose[] = [{ ...start }];

  for (const wp of waypoints) {
    poses.push({
      x: wp.position.x,
      y: wp.position.y,
      angle: wp.heading ?? 0, // placeholder, auto-calc will fix null headings
    });
  }

  poses.push({ ...end });
  return poses;
}

/** Auto-calculate headings for waypoints that had null heading */
function autoCalculateHeadings(poses: RobotPose[]): void {
  // We need to know which poses originally had null heading.
  // For now, recalculate any middle pose whose heading is suspiciously 0
  // and doesn't match the direction of travel.
  // In practice, the caller sets heading=0 for null-heading waypoints.
  for (let i = 1; i < poses.length - 1; i++) {
    const prev = poses[i - 1];
    const curr = poses[i];
    const next = poses[i + 1];

    // Auto-heading: average of incoming and outgoing angles
    const inAngle = angleBetween(prev, curr);
    const outAngle = angleBetween(curr, next);

    // Average the two angles (handle wraparound)
    const diff = normalizeAngle(outAngle - inAngle);
    poses[i].angle = normalizeAngle(inAngle + diff / 2);
  }
}

/** Fit a cubic Bezier curve between two poses */
function fitBezierBetweenPoses(from: RobotPose, to: RobotPose): FieldPoint[] {
  const dist = distance(from, to);
  const controlDist = dist / 3;

  const fromRad = degToRad(from.angle);
  const toRad = degToRad(to.angle);

  const p0: FieldPoint = { x: from.x, y: from.y };
  const p1: FieldPoint = {
    x: from.x + Math.cos(fromRad) * controlDist,
    y: from.y + Math.sin(fromRad) * controlDist,
  };
  const p2: FieldPoint = {
    x: to.x - Math.cos(toRad) * controlDist,
    y: to.y - Math.sin(toRad) * controlDist,
  };
  const p3: FieldPoint = { x: to.x, y: to.y };

  return sampleBezier(p0, p1, p2, p3, SAMPLES_PER_SEGMENT);
}

/** Decompose a Bezier path into Pybricks commands (straight/curve/turn) */
function decomposeToPybricksSegments(
  from: RobotPose,
  to: RobotPose,
  points: FieldPoint[],
): PathSegment[] {
  const headingChange = normalizeAngle(to.angle - from.angle);
  const dist = distance(from, to);

  // Trivial case: zero distance
  if (dist < 1) {
    if (Math.abs(headingChange) > STRAIGHT_THRESHOLD_DEG) {
      return [
        {
          type: 'turn',
          value: Math.round(headingChange),
          points: [{ x: from.x, y: from.y }],
          startPose: { ...from },
          endPose: { ...to },
        },
      ];
    }
    return [];
  }

  // Check if path is approximately straight
  if (Math.abs(headingChange) < STRAIGHT_THRESHOLD_DEG && isApproximatelyStraight(points)) {
    return [
      {
        type: 'straight',
        value: Math.round(dist),
        points,
        startPose: { ...from },
        endPose: { ...to },
      },
    ];
  }

  // Check if path has consistent curvature (can be a single curve())
  const curveParams = fitCurve(from, to, points, headingChange);
  if (curveParams) {
    return [
      {
        type: 'curve',
        value: Math.round(curveParams.radius),
        arcAngle: Math.round(curveParams.arcAngle),
        points,
        startPose: { ...from },
        endPose: { ...to },
      },
    ];
  }

  // Fallback: turn then straight (or split into turn + straight + turn)
  return splitIntoTurnAndStraight(from, to, points);
}

/** Check if sampled points are approximately collinear */
function isApproximatelyStraight(points: FieldPoint[]): boolean {
  if (points.length < 3) return true;

  const first = points[0];
  const last = points[points.length - 1];
  const totalDist = distance(first, last);
  if (totalDist < 1) return true;

  // Check max deviation from the straight line
  const dx = last.x - first.x;
  const dy = last.y - first.y;

  for (let i = 1; i < points.length - 1; i++) {
    const px = points[i].x - first.x;
    const py = points[i].y - first.y;
    const crossProduct = Math.abs(px * dy - py * dx);
    const deviation = crossProduct / totalDist;
    if (deviation > 5) return false; // more than 5mm deviation
  }

  return true;
}

/** Try to fit the path as a single curve() command */
function fitCurve(
  from: RobotPose,
  to: RobotPose,
  points: FieldPoint[],
  headingChange: number,
): { radius: number; arcAngle: number } | null {
  if (Math.abs(headingChange) < STRAIGHT_THRESHOLD_DEG) return null;

  const dist = distance(from, to);
  // Estimate radius from chord length and heading change
  const arcAngleRad = degToRad(headingChange);
  if (Math.abs(arcAngleRad) < 0.01) return null;

  const radius = dist / (2 * Math.sin(Math.abs(arcAngleRad) / 2));
  if (radius < 10 || radius > 5000) return null;

  // Verify curvature consistency: check that all points are approximately
  // on a circle of this radius
  const centerAngle = degToRad(from.angle) + (headingChange > 0 ? -Math.PI / 2 : Math.PI / 2);
  const cx = from.x + radius * Math.cos(centerAngle) * (headingChange > 0 ? 1 : -1);
  const cy = from.y + radius * Math.sin(centerAngle) * (headingChange > 0 ? 1 : -1);

  let maxError = 0;
  for (const p of points) {
    const r = distance(p, { x: cx, y: cy });
    const error = Math.abs(r - Math.abs(radius)) / Math.abs(radius);
    if (error > maxError) maxError = error;
  }

  if (maxError > CURVATURE_TOLERANCE) return null;

  // In Pybricks: positive radius = right turn, positive angle = forward arc
  const signedRadius = headingChange > 0 ? radius : -radius;

  return {
    radius: signedRadius,
    arcAngle: headingChange,
  };
}

/** Split path into turn-then-straight when curve doesn't fit */
function splitIntoTurnAndStraight(
  from: RobotPose,
  to: RobotPose,
  points: FieldPoint[],
): PathSegment[] {
  const segments: PathSegment[] = [];
  const directAngle = angleBetween(from, to);
  const initialTurn = normalizeAngle(directAngle - from.angle);
  const dist = distance(from, to);

  // Turn to face the target
  if (Math.abs(initialTurn) > STRAIGHT_THRESHOLD_DEG) {
    const midPose: RobotPose = {
      x: from.x,
      y: from.y,
      angle: normalizeAngle(from.angle + initialTurn),
    };
    segments.push({
      type: 'turn',
      value: Math.round(initialTurn),
      points: [{ x: from.x, y: from.y }],
      startPose: { ...from },
      endPose: midPose,
    });

    // Drive straight to target
    segments.push({
      type: 'straight',
      value: Math.round(dist),
      points,
      startPose: midPose,
      endPose: { x: to.x, y: to.y, angle: midPose.angle },
    });

    // Final turn to match end heading
    const finalTurn = normalizeAngle(to.angle - midPose.angle);
    if (Math.abs(finalTurn) > STRAIGHT_THRESHOLD_DEG) {
      segments.push({
        type: 'turn',
        value: Math.round(finalTurn),
        points: [{ x: to.x, y: to.y }],
        startPose: { x: to.x, y: to.y, angle: midPose.angle },
        endPose: { ...to },
      });
    }
  } else {
    // Heading is roughly correct, just go straight
    segments.push({
      type: 'straight',
      value: Math.round(dist),
      points,
      startPose: { ...from },
      endPose: { x: to.x, y: to.y, angle: from.angle },
    });

    const finalTurn = normalizeAngle(to.angle - from.angle);
    if (Math.abs(finalTurn) > STRAIGHT_THRESHOLD_DEG) {
      segments.push({
        type: 'turn',
        value: Math.round(finalTurn),
        points: [{ x: to.x, y: to.y }],
        startPose: { x: to.x, y: to.y, angle: from.angle },
        endPose: { ...to },
      });
    }
  }

  return segments;
}

/** Calculate heading from pose auto-calculation info */
export function autoHeading(poses: RobotPose[], waypointHeadings: Array<number | null>): number[] {
  const result = poses.map((p) => p.angle);

  for (let i = 1; i < poses.length - 1; i++) {
    const wpIdx = i - 1;
    if (wpIdx < waypointHeadings.length && waypointHeadings[wpIdx] !== null) {
      result[i] = waypointHeadings[wpIdx]!;
    } else {
      const inAngle = radToDeg(
        Math.atan2(poses[i].y - poses[i - 1].y, poses[i].x - poses[i - 1].x),
      );
      const outAngle = radToDeg(
        Math.atan2(poses[i + 1].y - poses[i].y, poses[i + 1].x - poses[i].x),
      );
      const diff = normalizeAngle(outAngle - inAngle);
      result[i] = normalizeAngle(inAngle + diff / 2);
    }
  }

  return result;
}
