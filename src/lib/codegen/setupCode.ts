import type { RobotProfile, Defaults } from '../../types';

export function generateSetupCode(
  profile: RobotProfile | null,
  defaults: Defaults,
  useProfile: boolean
): string {
  const lines: string[] = [];

  // Hub initialization
  lines.push('# Initialize hub');
  lines.push('hub = PrimeHub()');
  lines.push('');

  if (useProfile && profile) {
    // Generate code from profile
    lines.push('# Motor setup from profile');
    lines.push(generateMotorSetup(profile));
    lines.push('');

    // DriveBase setup
    lines.push('# DriveBase setup');
    lines.push(generateDriveBaseSetup(profile, defaults));
    lines.push('');

    // Sensor setup
    if (profile.sensors.length > 0) {
      lines.push('# Sensor setup');
      lines.push(generateSensorSetup(profile));
      lines.push('');
    }

    // Extra motors
    if (profile.extraMotors.length > 0) {
      lines.push('# Extra motors');
      lines.push(generateExtraMotorSetup(profile));
      lines.push('');
    }
  } else {
    // Generate minimal setup without profile
    lines.push('# Motor setup (configure as needed)');
    lines.push('left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)');
    lines.push('right_motor = Motor(Port.B, Direction.CLOCKWISE)');
    lines.push('');

    lines.push('# DriveBase setup');
    lines.push(`robot = DriveBase(left_motor, right_motor, wheel_diameter=${defaults.wheelDiameter}, axle_track=${defaults.axleTrack})`);
    lines.push(`robot.settings(straight_speed=${defaults.speed}, straight_acceleration=${defaults.acceleration}, turn_rate=${defaults.turnRate}, turn_acceleration=${defaults.turnAcceleration})`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateMotorSetup(profile: RobotProfile): string {
  const lines: string[] = [];

  const leftDir = profile.leftMotor.direction === 'clockwise' ? 'Direction.CLOCKWISE' : 'Direction.COUNTERCLOCKWISE';
  const rightDir = profile.rightMotor.direction === 'clockwise' ? 'Direction.CLOCKWISE' : 'Direction.COUNTERCLOCKWISE';

  if (profile.leftMotor.port) {
    lines.push(`left_motor = Motor(Port.${profile.leftMotor.port}, ${leftDir})`);
  }

  if (profile.rightMotor.port) {
    lines.push(`right_motor = Motor(Port.${profile.rightMotor.port}, ${rightDir})`);
  }

  return lines.join('\n');
}

function generateDriveBaseSetup(profile: RobotProfile, defaults: Defaults): string {
  const lines: string[] = [];

  lines.push(`robot = DriveBase(left_motor, right_motor, wheel_diameter=${profile.wheelDiameter}, axle_track=${profile.axleTrack})`);
  lines.push(`robot.settings(straight_speed=${defaults.speed}, straight_acceleration=${defaults.acceleration}, turn_rate=${defaults.turnRate}, turn_acceleration=${defaults.turnAcceleration})`);

  return lines.join('\n');
}

function generateSensorSetup(profile: RobotProfile): string {
  const lines: string[] = [];

  for (const sensor of profile.sensors) {
    if (!sensor.port) continue;

    switch (sensor.type) {
      case 'color':
        lines.push(`color_sensor = ColorSensor(Port.${sensor.port})`);
        break;
      case 'ultrasonic':
        lines.push(`distance_sensor = UltrasonicSensor(Port.${sensor.port})`);
        break;
      case 'force':
        lines.push(`force_sensor = ForceSensor(Port.${sensor.port})`);
        break;
      case 'gyro':
        // PrimeHub has built-in gyro, no setup needed
        lines.push('# Gyro is built into the hub');
        break;
    }
  }

  return lines.join('\n');
}

function generateExtraMotorSetup(profile: RobotProfile): string {
  const lines: string[] = [];

  for (const motor of profile.extraMotors) {
    if (!motor.port) continue;

    const dir = motor.direction === 'clockwise' ? 'Direction.CLOCKWISE' : 'Direction.COUNTERCLOCKWISE';
    const name = motor.name.toLowerCase().replace(/\s+/g, '_');
    lines.push(`${name} = Motor(Port.${motor.port}, ${dir})`);
  }

  return lines.join('\n');
}
