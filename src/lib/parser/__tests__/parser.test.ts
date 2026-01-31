import { describe, it, expect } from 'vitest';
import { parseCommand } from '../index';
import { levenshteinDistance, isFuzzyMatch } from '../fuzzyMatch';

describe('fuzzyMatch', () => {
  it('calculates levenshtein distance correctly', () => {
    expect(levenshteinDistance('forward', 'forward')).toBe(0);
    expect(levenshteinDistance('forward', 'forwrad')).toBe(2);
    expect(levenshteinDistance('forward', 'frwrd')).toBe(2);
  });

  it('matches with tolerance', () => {
    expect(isFuzzyMatch('forwrad', 'forward', 3)).toBe(true);
    expect(isFuzzyMatch('frwrd', 'forward', 3)).toBe(true);
    expect(isFuzzyMatch('xyz', 'forward', 3)).toBe(false);
  });
});

describe('parseCommand', () => {
  describe('move commands', () => {
    it('parses "move forward 200mm"', () => {
      const result = parseCommand('move forward 200mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(200)');
    });

    it('parses "go forward 100"', () => {
      const result = parseCommand('go forward 100');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(100)');
    });

    it('parses with typo "move forwrad 200mm"', () => {
      const result = parseCommand('move forwrad 200mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(200)');
    });

    it('parses "move backward 150mm"', () => {
      const result = parseCommand('move backward 150mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(-150)');
    });

    it('asks for clarification when distance missing', () => {
      const result = parseCommand('move forward');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('distance');
    });

    it('handles centimeters', () => {
      const result = parseCommand('move forward 10cm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(100)');
    });

    it('handles meters', () => {
      const result = parseCommand('move forward 1m');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(1000)');
    });

    it('parses "drive straight 50mm"', () => {
      const result = parseCommand('drive straight 50mm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(50)');
    });
  });

  describe('turn commands', () => {
    it('parses "turn right 90 degrees"', () => {
      const result = parseCommand('turn right 90 degrees');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(90)');
    });

    it('parses "turn left 45"', () => {
      const result = parseCommand('turn left 45');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(-45)');
    });

    it('asks for clarification when angle missing', () => {
      const result = parseCommand('turn right');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('angle');
    });

    it('parses "rotate left 180"', () => {
      const result = parseCommand('rotate left 180');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(-180)');
    });

    it('parses "spin right 360"', () => {
      const result = parseCommand('spin right 360');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.turn(360)');
    });
  });

  describe('wait commands', () => {
    it('parses "wait 500ms"', () => {
      const result = parseCommand('wait 500ms');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(500)');
    });

    it('parses "wait 2 seconds"', () => {
      const result = parseCommand('wait 2 seconds');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(2000)');
    });

    it('parses "pause 1 second"', () => {
      const result = parseCommand('pause 1 second');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(1000)');
    });

    it('asks for clarification when duration missing', () => {
      const result = parseCommand('wait');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('duration');
    });

    it('defaults to seconds when no unit given', () => {
      const result = parseCommand('wait 3');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('wait(3000)');
    });
  });

  describe('motor commands', () => {
    it('parses "run arm motor for 90 degrees"', () => {
      const result = parseCommand('run arm motor for 90 degrees');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toContain('arm.run_angle');
      expect(result.pythonCode).toContain('90');
    });

    it('parses "spin claw 45"', () => {
      const result = parseCommand('spin claw 45');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toContain('claw.run_angle');
    });

    it('asks for clarification when angle missing', () => {
      const result = parseCommand('run arm motor');
      expect(result.success).toBe(false);
      expect(result.needsClarification?.type).toBe('angle');
    });
  });

  describe('stop commands', () => {
    it('parses "stop"', () => {
      const result = parseCommand('stop');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.stop()');
    });

    it('parses "stop arm motor"', () => {
      const result = parseCommand('stop arm motor');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('arm.stop()');
    });

    it('parses "halt"', () => {
      const result = parseCommand('halt');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.stop()');
    });

    it('parses "brake"', () => {
      const result = parseCommand('brake');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.stop()');
    });
  });

  describe('set speed commands', () => {
    it('parses "set speed to 100"', () => {
      const result = parseCommand('set speed to 100');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.settings(straight_speed=100)');
    });

    it('parses "speed 200"', () => {
      const result = parseCommand('speed 200');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.settings(straight_speed=200)');
    });

    it('parses "change speed to 150"', () => {
      const result = parseCommand('change speed to 150');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.settings(straight_speed=150)');
    });

    it('parses "set turn speed to 90"', () => {
      const result = parseCommand('set turn speed to 90');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.settings(turn_rate=90)');
    });

    it('asks for clarification when speed value missing', () => {
      const result = parseCommand('set speed');
      expect(result.success).toBe(false);
      expect(result.needsClarification).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseCommand('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty command');
    });

    it('handles unrecognized commands', () => {
      const result = parseCommand('dance happily');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not parse command');
    });

    it('handles decimal distances', () => {
      const result = parseCommand('move forward 10.5cm');
      expect(result.success).toBe(true);
      expect(result.pythonCode).toBe('robot.straight(105)');
    });
  });
});
