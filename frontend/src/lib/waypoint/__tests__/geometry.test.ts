import { describe, it, expect } from 'vitest';
import {
  degToRad,
  radToDeg,
  distance,
  angleBetween,
  normalizeAngle,
  segmentIntersectsRect,
  polylineIntersectsInflatedRect,
  cubicBezier,
  sampleBezier,
} from '../geometry';

describe('degToRad / radToDeg', () => {
  it('converts 0 degrees', () => {
    expect(degToRad(0)).toBe(0);
    expect(radToDeg(0)).toBe(0);
  });

  it('converts 90 degrees', () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
  });

  it('round-trips', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45);
    expect(degToRad(radToDeg(1.5))).toBeCloseTo(1.5);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('computes horizontal distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
  });

  it('computes diagonal distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('angleBetween', () => {
  it('returns 0 for east direction', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });

  it('returns 90 for south direction (canvas Y-down)', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
  });

  it('returns -90 for north direction', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(-90);
  });

  it('returns 180 for west direction', () => {
    expect(Math.abs(angleBetween({ x: 0, y: 0 }, { x: -1, y: 0 }))).toBeCloseTo(180);
  });
});

describe('normalizeAngle', () => {
  it('keeps angles in range', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(-90)).toBe(-90);
  });

  it('wraps positive angles', () => {
    expect(normalizeAngle(270)).toBeCloseTo(-90);
    expect(normalizeAngle(360)).toBeCloseTo(0);
    expect(normalizeAngle(540)).toBeCloseTo(-180);
  });

  it('wraps negative angles', () => {
    expect(normalizeAngle(-270)).toBeCloseTo(90);
    expect(normalizeAngle(-360)).toBeCloseTo(0);
  });
});

describe('segmentIntersectsRect', () => {
  const rect = { x: 10, y: 10, w: 20, h: 20 }; // 10,10 to 30,30

  it('detects segment passing through rect', () => {
    expect(
      segmentIntersectsRect({ x: 0, y: 20 }, { x: 40, y: 20 }, rect.x, rect.y, rect.w, rect.h),
    ).toBe(true);
  });

  it('detects endpoint inside rect', () => {
    expect(
      segmentIntersectsRect({ x: 0, y: 0 }, { x: 15, y: 15 }, rect.x, rect.y, rect.w, rect.h),
    ).toBe(true);
  });

  it('returns false for segment that misses rect', () => {
    expect(
      segmentIntersectsRect({ x: 0, y: 0 }, { x: 5, y: 5 }, rect.x, rect.y, rect.w, rect.h),
    ).toBe(false);
  });

  it('returns false for segment above rect', () => {
    expect(
      segmentIntersectsRect({ x: 0, y: 0 }, { x: 40, y: 0 }, rect.x, rect.y, rect.w, rect.h),
    ).toBe(false);
  });
});

describe('polylineIntersectsInflatedRect', () => {
  it('detects collision with inflated rect', () => {
    const points = [
      { x: 0, y: 20 },
      { x: 5, y: 20 },
    ];
    // Rect at 10,10 size 20x20. With inflation 10, becomes 0,0 size 40x40
    expect(polylineIntersectsInflatedRect(points, 10, 10, 20, 20, 10)).toBe(true);
  });

  it('returns false when polyline misses inflated rect', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
    ];
    // Rect at 100,100 size 20x20. Even with inflation 5, it's 95,95 to 125,125
    expect(polylineIntersectsInflatedRect(points, 100, 100, 20, 20, 5)).toBe(false);
  });
});

describe('cubicBezier', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 0, y: 100 };
  const p2 = { x: 100, y: 100 };
  const p3 = { x: 100, y: 0 };

  it('returns start at t=0', () => {
    const result = cubicBezier(p0, p1, p2, p3, 0);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns end at t=1', () => {
    const result = cubicBezier(p0, p1, p2, p3, 1);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns midpoint at t=0.5', () => {
    const result = cubicBezier(p0, p1, p2, p3, 0.5);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(75);
  });
});

describe('sampleBezier', () => {
  it('returns numSamples+1 points', () => {
    const p = { x: 0, y: 0 };
    const points = sampleBezier(p, p, p, p, 10);
    expect(points).toHaveLength(11);
  });

  it('first and last match endpoints', () => {
    const p0 = { x: 0, y: 0 };
    const p3 = { x: 100, y: 100 };
    const points = sampleBezier(p0, { x: 30, y: 0 }, { x: 70, y: 100 }, p3, 20);
    expect(points[0].x).toBeCloseTo(0);
    expect(points[0].y).toBeCloseTo(0);
    expect(points[20].x).toBeCloseTo(100);
    expect(points[20].y).toBeCloseTo(100);
  });
});
