/** Raw telemetry sample from the hub. */
export interface TelemetrySample {
  /** Milliseconds since recording start. */
  timestamp: number;
  /** Left drive motor angle in degrees. */
  leftAngle: number;
  /** Right drive motor angle in degrees. */
  rightAngle: number;
  /** Attachment motor 1 angle (if configured). */
  attachment1Angle?: number;
  /** Attachment motor 2 angle (if configured). */
  attachment2Angle?: number;
}

/** A summary line for the save dialog preview. */
export interface RecordedCommand {
  /** e.g. "robot.straight(200)" */
  code: string;
  /** e.g. "Move forward 200mm" */
  description: string;
}

/** Recording lifecycle phases. */
export type RecordingPhase = 'idle' | 'uploading' | 'recording' | 'processing' | 'saving';

/** Port configuration needed by the telemetry program. */
export interface TelemetryPortConfig {
  leftMotorPort: string;
  rightMotorPort: string;
  attachment1Port?: string;
  attachment2Port?: string;
}
