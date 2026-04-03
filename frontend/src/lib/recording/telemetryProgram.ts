import type { TelemetryPortConfig } from '../../types/recording';

/**
 * Generates a Pybricks Python program that reads motor encoder angles
 * every 50ms and prints telemetry lines to stdout.
 *
 * Output format: D,timestamp,leftAngle,rightAngle[,att1Angle][,att2Angle]
 */
export function generateTelemetryProgram(config: TelemetryPortConfig): string {
  const { leftMotorPort, rightMotorPort, attachment1Port, attachment2Port } = config;

  const hasAtt1 = attachment1Port && attachment1Port !== 'None';
  const hasAtt2 = attachment2Port && attachment2Port !== 'None';

  const motorImports: string[] = [];
  const motorInits: string[] = [];
  const angleVars: string[] = ['left_motor.angle()', 'right_motor.angle()'];

  motorImports.push('Motor');
  // Use the same motor directions as the generated setup code so that
  // recorded angles match the replay coordinate system.
  motorInits.push(`left_motor = Motor(Port.${leftMotorPort}, Direction.COUNTERCLOCKWISE)`);
  motorInits.push(`right_motor = Motor(Port.${rightMotorPort}, Direction.CLOCKWISE)`);

  if (hasAtt1) {
    motorInits.push(`att1_motor = Motor(Port.${attachment1Port})`);
    angleVars.push('att1_motor.angle()');
  }

  if (hasAtt2) {
    motorInits.push(`att2_motor = Motor(Port.${attachment2Port})`);
    angleVars.push('att2_motor.angle()');
  }

  const printExpr = `"D," + str(elapsed) + "," + ${angleVars.map((v) => `str(${v})`).join(' + "," + ')}`;

  const lines = [
    'from pybricks.hubs import PrimeHub',
    `from pybricks.pupdevices import ${motorImports.join(', ')}`,
    'from pybricks.parameters import Port, Direction',
    'from pybricks.tools import wait, StopWatch',
    '',
    'hub = PrimeHub()',
    ...motorInits,
    '',
    '# Reset motor angles',
    'left_motor.reset_angle(0)',
    'right_motor.reset_angle(0)',
    ...(hasAtt1 ? ['att1_motor.reset_angle(0)'] : []),
    ...(hasAtt2 ? ['att2_motor.reset_angle(0)'] : []),
    '',
    'sw = StopWatch()',
    '',
    '# Signal ready',
    'print("READY")',
    '',
    'while True:',
    '    elapsed = sw.time()',
    `    print(${printExpr})`,
    '    wait(50)',
  ];

  return lines.join('\n');
}
