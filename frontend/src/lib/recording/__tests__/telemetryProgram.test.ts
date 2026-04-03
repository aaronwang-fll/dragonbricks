import { describe, it, expect } from 'vitest';
import { generateTelemetryProgram } from '../telemetryProgram';

describe('generateTelemetryProgram', () => {
  it('generates a drive-only program', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'A',
      rightMotorPort: 'B',
    });

    expect(code).toContain('Port.A');
    expect(code).toContain('Port.B');
    expect(code).toContain('left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)');
    expect(code).toContain('right_motor = Motor(Port.B, Direction.CLOCKWISE)');
    expect(code).toContain('left_motor.reset_angle(0)');
    expect(code).toContain('right_motor.reset_angle(0)');
    expect(code).toContain('print("READY")');
    expect(code).toContain('wait(50)');
    expect(code).not.toContain('att1_motor');
    expect(code).not.toContain('att2_motor');
  });

  it('includes attachment motor 1', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'A',
      rightMotorPort: 'B',
      attachment1Port: 'C',
    });

    expect(code).toContain('att1_motor = Motor(Port.C)');
    expect(code).toContain('att1_motor.reset_angle(0)');
    expect(code).toContain('att1_motor.angle()');
    expect(code).not.toContain('att2_motor');
  });

  it('includes both attachment motors', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'A',
      rightMotorPort: 'B',
      attachment1Port: 'C',
      attachment2Port: 'D',
    });

    expect(code).toContain('att1_motor = Motor(Port.C)');
    expect(code).toContain('att2_motor = Motor(Port.D)');
    expect(code).toContain('att1_motor.reset_angle(0)');
    expect(code).toContain('att2_motor.reset_angle(0)');
  });

  it('uses correct port letters', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'E',
      rightMotorPort: 'F',
      attachment1Port: 'C',
    });

    expect(code).toContain('Port.E');
    expect(code).toContain('Port.F');
    expect(code).toContain('Port.C');
  });

  it('skips attachment ports set to None', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'A',
      rightMotorPort: 'B',
      attachment1Port: 'None',
      attachment2Port: 'None',
    });

    expect(code).not.toContain('att1_motor');
    expect(code).not.toContain('att2_motor');
  });

  it('generates valid Python syntax', () => {
    const code = generateTelemetryProgram({
      leftMotorPort: 'A',
      rightMotorPort: 'B',
    });

    // Check it has the essential structure
    expect(code).toContain('from pybricks.hubs import PrimeHub');
    expect(code).toContain('from pybricks.pupdevices import Motor');
    expect(code).toContain('from pybricks.parameters import Port, Direction');
    expect(code).toContain('from pybricks.tools import wait, StopWatch');
    expect(code).toContain('while True:');
  });
});
