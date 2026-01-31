// Robot profile types
export interface RobotProfile {
  id: string;
  name: string;
  isDefault: boolean;
  leftMotor: PortConfig;
  rightMotor: PortConfig;
  wheelDiameter: number;
  axleTrack: number;
  sensors: SensorConfig[];
  extraMotors: MotorConfig[];
}

export interface PortConfig {
  port: Port | null;
  direction: Direction;
}

export interface SensorConfig {
  type: SensorType;
  port: Port | null;
}

export interface MotorConfig {
  name: string;
  port: Port | null;
  direction: Direction;
}

export type Port = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Direction = 'clockwise' | 'counterclockwise';
export type SensorType = 'color' | 'ultrasonic' | 'force' | 'gyro';

// Command types
export interface ParsedCommand {
  id: string;
  naturalLanguage: string;
  pythonCode: string | null;
  status: 'pending' | 'parsed' | 'error' | 'needs-clarification';
  clarification?: ClarificationRequest;
  error?: string;
}

export interface ClarificationRequest {
  field: string;
  message: string;
  type: 'distance' | 'angle' | 'duration';
}

// Program types
export interface Program {
  id: string;
  name: string;
  setupSection: string;
  mainSection: string;
  routines: Routine[];
  createdAt: Date;
  updatedAt: Date;
  profileId: string | null;
}

export interface Routine {
  id: string;
  name: string;
  parameters: string[];
  body: string;
}

// Defaults
export interface Defaults {
  speed: number;
  acceleration: number;
  turnRate: number;
  turnAcceleration: number;
  stopBehavior: 'hold' | 'brake' | 'coast';
  wheelDiameter: number;
  axleTrack: number;
  motorSpeed: number;
  lineThreshold: number;
}

export const DEFAULT_VALUES: Defaults = {
  speed: 200,
  acceleration: 700,
  turnRate: 150,
  turnAcceleration: 300,
  stopBehavior: 'hold',
  wheelDiameter: 56,
  axleTrack: 112,
  motorSpeed: 200,
  lineThreshold: 50,
};
