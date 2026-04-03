import { describe, it, expect } from 'vitest';
import { generateWaypointCode, generateWaypointProgram } from '../waypointCodegen';
import type { ComputedPath } from '../../../types/waypoint';

describe('generateWaypointCode', () => {
  it('returns comment for empty path', () => {
    const path: ComputedPath = {
      segments: [],
      totalDistance: 0,
      hasCollision: false,
      collidingObstacleIds: [],
    };
    expect(generateWaypointCode(path)).toBe('# No path segments');
  });

  it('generates straight command', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'straight',
          value: 500,
          points: [{ x: 0, y: 0 }, { x: 500, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 500, y: 0, angle: 0 },
        },
      ],
      totalDistance: 500,
      hasCollision: false,
      collidingObstacleIds: [],
    };
    const code = generateWaypointCode(path);
    expect(code).toContain('robot.straight(500)');
  });

  it('generates turn command', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'turn',
          value: 90,
          points: [{ x: 0, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 0, y: 0, angle: 90 },
        },
      ],
      totalDistance: 0,
      hasCollision: false,
      collidingObstacleIds: [],
    };
    const code = generateWaypointCode(path);
    expect(code).toContain('robot.turn(90)');
  });

  it('generates curve command', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'curve',
          value: 300,
          arcAngle: 45,
          points: [{ x: 0, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 200, y: 100, angle: 45 },
        },
      ],
      totalDistance: 236,
      hasCollision: false,
      collidingObstacleIds: [],
    };
    const code = generateWaypointCode(path);
    expect(code).toContain('robot.curve(300, 45)');
  });

  it('generates wait command', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'wait',
          value: 2000,
          points: [{ x: 0, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 0, y: 0, angle: 0 },
        },
      ],
      totalDistance: 0,
      hasCollision: false,
      collidingObstacleIds: [],
    };
    const code = generateWaypointCode(path);
    expect(code).toContain('wait(2000)');
  });

  it('includes collision warning', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'straight',
          value: 500,
          points: [{ x: 0, y: 0 }, { x: 500, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 500, y: 0, angle: 0 },
        },
      ],
      totalDistance: 500,
      hasCollision: true,
      collidingObstacleIds: ['obs1', 'obs2'],
    };
    const code = generateWaypointCode(path);
    expect(code).toContain('WARNING');
    expect(code).toContain('obs1');
    expect(code).toContain('obs2');
  });
});

describe('generateWaypointProgram', () => {
  it('generates complete Pybricks program', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'straight',
          value: 200,
          points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 200, y: 0, angle: 0 },
        },
        {
          type: 'turn',
          value: 90,
          points: [{ x: 200, y: 0 }],
          startPose: { x: 200, y: 0, angle: 0 },
          endPose: { x: 200, y: 0, angle: 90 },
        },
      ],
      totalDistance: 200,
      hasCollision: false,
      collidingObstacleIds: [],
    };

    const code = generateWaypointProgram(path, {
      leftMotorPort: 'C',
      rightMotorPort: 'D',
      wheelDiameter: 62,
      axleTrack: 120,
    });

    expect(code).toContain('from pybricks.hubs import PrimeHub');
    expect(code).toContain('from pybricks.robotics import DriveBase');
    expect(code).toContain('Port.C');
    expect(code).toContain('Port.D');
    expect(code).toContain('wheel_diameter=62');
    expect(code).toContain('axle_track=120');
    expect(code).toContain('robot.straight(200)');
    expect(code).toContain('robot.turn(90)');
  });

  it('uses default config when not provided', () => {
    const path: ComputedPath = {
      segments: [
        {
          type: 'straight',
          value: 100,
          points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
          startPose: { x: 0, y: 0, angle: 0 },
          endPose: { x: 100, y: 0, angle: 0 },
        },
      ],
      totalDistance: 100,
      hasCollision: false,
      collidingObstacleIds: [],
    };

    const code = generateWaypointProgram(path);
    expect(code).toContain('Port.A');
    expect(code).toContain('Port.B');
    expect(code).toContain('wheel_diameter=56');
  });
});
