import { describe, it, expect } from 'vitest';
import { planPath } from '../pathPlanner';
import type { RobotPose, Waypoint, Obstacle, RobotSize } from '../../../types/waypoint';

const defaultRobotSize: RobotSize = { width: 160, length: 200 };

describe('planPath', () => {
  it('returns empty path when start equals end with no waypoints', () => {
    const start: RobotPose = { x: 100, y: 100, angle: 0 };
    const end: RobotPose = { x: 100, y: 100, angle: 0 };
    const result = planPath(start, end, [], [], defaultRobotSize);

    // Might produce a zero-distance straight or empty
    expect(result.hasCollision).toBe(false);
    expect(result.collidingObstacleIds).toEqual([]);
  });

  it('generates a straight segment for aligned start and end', () => {
    const start: RobotPose = { x: 0, y: 0, angle: 0 };
    const end: RobotPose = { x: 500, y: 0, angle: 0 };
    const result = planPath(start, end, [], [], defaultRobotSize);

    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.totalDistance).toBeGreaterThan(0);

    // Should contain a straight segment
    const straights = result.segments.filter((s) => s.type === 'straight');
    expect(straights.length).toBeGreaterThan(0);
    expect(straights[0].value).toBeCloseTo(500, -1);
  });

  it('generates a turn for 90-degree heading change with no movement', () => {
    const start: RobotPose = { x: 100, y: 100, angle: 0 };
    const end: RobotPose = { x: 100, y: 100, angle: 90 };
    const result = planPath(start, end, [], [], defaultRobotSize);

    const turns = result.segments.filter((s) => s.type === 'turn');
    expect(turns.length).toBeGreaterThan(0);
    expect(turns[0].value).toBeCloseTo(90, -1);
  });

  it('handles waypoints between start and end', () => {
    const start: RobotPose = { x: 0, y: 0, angle: 0 };
    const end: RobotPose = { x: 1000, y: 0, angle: 0 };
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        name: 'WP 1',
        position: { x: 500, y: 200 },
        heading: null,
        isPause: false,
        pauseMs: 0,
      },
    ];
    const result = planPath(start, end, waypoints, [], defaultRobotSize);

    expect(result.segments.length).toBeGreaterThan(1);
    expect(result.totalDistance).toBeGreaterThan(1000);
  });

  it('includes wait segment for pause waypoints', () => {
    const start: RobotPose = { x: 0, y: 0, angle: 0 };
    const end: RobotPose = { x: 500, y: 0, angle: 0 };
    const waypoints: Waypoint[] = [
      {
        id: 'wp1',
        name: 'Pause 1',
        position: { x: 250, y: 0 },
        heading: 0,
        isPause: true,
        pauseMs: 2000,
      },
    ];
    const result = planPath(start, end, waypoints, [], defaultRobotSize);

    const waits = result.segments.filter((s) => s.type === 'wait');
    expect(waits.length).toBe(1);
    expect(waits[0].value).toBe(2000);
  });

  it('detects collisions with obstacles', () => {
    const start: RobotPose = { x: 0, y: 500, angle: 0 };
    const end: RobotPose = { x: 1000, y: 500, angle: 0 };
    const obstacles: Obstacle[] = [
      {
        id: 'obs1',
        name: 'Wall',
        x: 400,
        y: 400,
        width: 200,
        height: 200,
        isPreset: false,
      },
    ];
    const result = planPath(start, end, [], obstacles, defaultRobotSize);

    expect(result.hasCollision).toBe(true);
    expect(result.collidingObstacleIds).toContain('obs1');
  });

  it('reports no collision when path avoids obstacles', () => {
    const start: RobotPose = { x: 0, y: 0, angle: 0 };
    const end: RobotPose = { x: 500, y: 0, angle: 0 };
    const obstacles: Obstacle[] = [
      {
        id: 'obs-far',
        name: 'Far Away',
        x: 0,
        y: 800,
        width: 100,
        height: 100,
        isPreset: false,
      },
    ];
    const result = planPath(start, end, [], obstacles, defaultRobotSize);

    expect(result.hasCollision).toBe(false);
    expect(result.collidingObstacleIds).toEqual([]);
  });
});
