import { describe, it, expect } from 'vitest';
import { generateUberCode } from '../generator';
import type { ButtonMapping } from '../../../types/ubercode';

const defaultMapping: ButtonMapping = {
  center: 'run',
  right: 'next',
  left: 'previous',
  bluetooth: 'unused',
};

describe('generateUberCode', () => {
  it('generates a program with two runs', () => {
    const code = generateUberCode(
      {
        imports:
          'from pybricks.hubs import PrimeHub\nfrom pybricks.robotics import DriveBase\nfrom pybricks.tools import wait',
        setup:
          'hub = PrimeHub()\nrobot = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=112)',
      },
      [
        { name: 'Mission 1', mainCode: 'robot.straight(200)' },
        { name: 'Mission 2', mainCode: 'robot.turn(90)\nrobot.straight(100)' },
      ],
      defaultMapping,
    );

    expect(code).toContain('from pybricks.hubs import PrimeHub');
    expect(code).toContain('from pybricks.parameters import Button');
    expect(code).toContain('def run_1():');
    expect(code).toContain('def run_2():');
    expect(code).toContain('robot.straight(200)');
    expect(code).toContain('robot.turn(90)');
    expect(code).toContain('runs = [run_1, run_2]');
    expect(code).toContain('Button.CENTER');
    expect(code).toContain('hub.display.number(current + 1)');
  });

  it('maps buttons correctly per config', () => {
    const mapping: ButtonMapping = {
      center: 'next',
      right: 'run',
      left: 'unused',
      bluetooth: 'previous',
    };

    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Run A', mainCode: 'wait(1000)' }],
      mapping,
    );

    expect(code).toContain('Button.RIGHT');
    expect(code).toContain('Button.BLUETOOTH');
    expect(code).not.toContain('Button.LEFT');
  });

  it('auto-advances after running', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [
        { name: 'R1', mainCode: 'wait(100)' },
        { name: 'R2', mainCode: 'wait(200)' },
      ],
      defaultMapping,
    );

    expect(code).toContain('current = (current + 1) % len(runs)');
  });

  it('wraps around when navigating past last or before first run', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [
        { name: 'R1', mainCode: 'wait(100)' },
        { name: 'R2', mainCode: 'wait(200)' },
      ],
      defaultMapping,
    );

    expect(code).toContain('(current + 1) % len(runs)');
    expect(code).toContain('(current - 1) % len(runs)');
  });

  it('includes Button import even if not in original imports', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Test', mainCode: 'pass' }],
      defaultMapping,
    );

    expect(code).toContain('from pybricks.parameters import Button');
  });

  it('handles single run', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Only Run', mainCode: 'wait(500)' }],
      defaultMapping,
    );

    expect(code).toContain('runs = [run_1]');
    expect(code).toContain('def run_1():');
  });

  it('includes run names as comments', () => {
    const code = generateUberCode(
      {
        imports: 'from pybricks.hubs import PrimeHub\nfrom pybricks.tools import wait',
        setup: 'hub = PrimeHub()',
      },
      [{ name: 'Coral Reef', mainCode: 'wait(100)' }],
      defaultMapping,
    );

    expect(code).toContain('# Run 1: Coral Reef');
  });
});
