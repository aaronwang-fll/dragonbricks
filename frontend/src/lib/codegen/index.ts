import type { RobotProfile, Defaults } from '../../types';
import { generateSetupCode } from './setupCode';

export interface GeneratedProgram {
  imports: string;
  setup: string;
  main: string;
  full: string;
}

export function generateFullProgram(
  profile: RobotProfile | null,
  defaults: Defaults,
  commands: string[],
  useProfile: boolean
): GeneratedProgram {
  const imports = generateImports(profile, useProfile);
  const setup = generateSetupCode(profile, defaults, useProfile);
  const main = generateMainCode(commands);

  const full = `${imports}

${setup}

# Main program
${main}
`;

  return { imports, setup, main, full };
}

function generateImports(_profile: RobotProfile | null, _useProfile: boolean): string {
  const imports = [
    'from pybricks.hubs import PrimeHub',
    'from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor',
    'from pybricks.parameters import Port, Direction, Stop, Color',
    'from pybricks.robotics import DriveBase',
    'from pybricks.tools import wait',
  ];

  return imports.join('\n');
}

function generateMainCode(commands: string[]): string {
  if (commands.length === 0) {
    return '# Add your commands here\npass';
  }

  return commands.join('\n');
}

export { generateSetupCode } from './setupCode';
