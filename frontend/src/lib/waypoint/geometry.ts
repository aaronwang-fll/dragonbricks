import type { FieldPoint } from '../../types/waypoint';

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Euclidean distance between two points */
export function distance(a: FieldPoint, b: FieldPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Angle from point a to point b in degrees (0 = east, CCW positive) */
export function angleBetween(a: FieldPoint, b: FieldPoint): number {
  return radToDeg(Math.atan2(b.y - a.y, b.x - a.x));
}

/** Normalize angle to [-180, 180) range */
export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a >= 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/** Test if a line segment (p1->p2) intersects an axis-aligned bounding box */
export function segmentIntersectsRect(
  p1: FieldPoint,
  p2: FieldPoint,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  // Check if either endpoint is inside the rect
  if (pointInRect(p1, rx, ry, rw, rh) || pointInRect(p2, rx, ry, rw, rh)) {
    return true;
  }

  // Check segment against each edge of the rectangle
  const corners: FieldPoint[] = [
    { x: rx, y: ry },
    { x: rx + rw, y: ry },
    { x: rx + rw, y: ry + rh },
    { x: rx, y: ry + rh },
  ];

  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    if (segmentsIntersect(p1, p2, c1, c2)) {
      return true;
    }
  }

  return false;
}

/** Test if a polyline intersects an inflated rectangle (obstacle expanded by robot radius) */
export function polylineIntersectsInflatedRect(
  points: FieldPoint[],
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  inflation: number,
): boolean {
  const ix = rx - inflation;
  const iy = ry - inflation;
  const iw = rw + inflation * 2;
  const ih = rh + inflation * 2;

  for (let i = 0; i < points.length - 1; i++) {
    if (segmentIntersectsRect(points[i], points[i + 1], ix, iy, iw, ih)) {
      return true;
    }
  }

  return false;
}

/** Evaluate a cubic Bezier curve at parameter t (0..1) */
export function cubicBezier(
  p0: FieldPoint,
  p1: FieldPoint,
  p2: FieldPoint,
  p3: FieldPoint,
  t: number,
): FieldPoint {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/** Sample a cubic Bezier curve into N points */
export function sampleBezier(
  p0: FieldPoint,
  p1: FieldPoint,
  p2: FieldPoint,
  p3: FieldPoint,
  numSamples: number,
): FieldPoint[] {
  const points: FieldPoint[] = [];
  for (let i = 0; i <= numSamples; i++) {
    points.push(cubicBezier(p0, p1, p2, p3, i / numSamples));
  }
  return points;
}

// --- Internal helpers ---

function pointInRect(
  p: FieldPoint,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  return p.x >= rx && p.x <= rx + rw && p.y >= ry && p.y <= ry + rh;
}

/** Cross product of vectors (b-a) and (c-a) */
function cross(a: FieldPoint, b: FieldPoint, c: FieldPoint): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Test if two line segments (a1-a2) and (b1-b2) intersect */
function segmentsIntersect(
  a1: FieldPoint,
  a2: FieldPoint,
  b1: FieldPoint,
  b2: FieldPoint,
): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Collinear cases
  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;

  return false;
}

/** Check if point p lies on segment (a-b), assuming collinear */
function onSegment(a: FieldPoint, b: FieldPoint, p: FieldPoint): boolean {
  return (
    Math.min(a.x, b.x) <= p.x &&
    p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y &&
    p.y <= Math.max(a.y, b.y)
  );
}
