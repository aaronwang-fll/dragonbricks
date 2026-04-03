import type { TelemetrySample, RecordedCommand } from '../../types/recording';

export interface SegmenterConfig {
  wheelDiameter: number; // mm
  axleTrack: number; // mm
  hasAttachment1: boolean;
  hasAttachment2: boolean;
}

export interface ReplayResult {
  /** Complete Python code for the replay loop. Goes into routine body. */
  replayCode: string;
  /** Human-readable summary lines for the save dialog preview. */
  summary: RecordedCommand[];
  /** Number of raw samples. */
  sampleCount: number;
  /** Total duration in ms. */
  durationMs: number;
}

// ---- Per-sample motion increments ----

interface Increment {
  dt: number;
  dist: number; // mm forward (positive = forward)
  heading: number; // degrees (positive = clockwise/right)
  leftDeg: number; // raw left motor delta
  rightDeg: number; // raw right motor delta
  att1Delta: number;
  att2Delta: number;
}

function computeIncrements(samples: TelemetrySample[], config: SegmenterConfig): Increment[] {
  const degToMm = (Math.PI * config.wheelDiameter) / 360;
  const result: Increment[] = [];

  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].timestamp - samples[i - 1].timestamp;
    const dLeftDeg = samples[i].leftAngle - samples[i - 1].leftAngle;
    const dRightDeg = samples[i].rightAngle - samples[i - 1].rightAngle;

    const dL = dLeftDeg * degToMm;
    const dR = dRightDeg * degToMm;

    result.push({
      dt,
      dist: (dL + dR) / 2,
      heading: ((dL - dR) / config.axleTrack) * (180 / Math.PI),
      leftDeg: dLeftDeg,
      rightDeg: dRightDeg,
      att1Delta: config.hasAttachment1
        ? (samples[i].attachment1Angle ?? 0) - (samples[i - 1].attachment1Angle ?? 0)
        : 0,
      att2Delta: config.hasAttachment2
        ? (samples[i].attachment2Angle ?? 0) - (samples[i - 1].attachment2Angle ?? 0)
        : 0,
    });
  }

  return result;
}

// ---- Drive command segmentation ----

export interface DriveCommand {
  type: 'straight' | 'turn' | 'wait' | 'attachment';
  value: number; // mm, degrees, or ms
  /** For attachment commands: which attachment (1 or 2). */
  attachmentId?: number;
  /** Duration of the original segment in ms (for attachment speed calc). */
  durationMs?: number;
}

/** Per-sample idle threshold — motor degrees below which a sample is idle. */
const IDLE_MOTOR_DEG = 0.5;

/**
 * Number of consecutive idle samples required before a motion segment is
 * truly broken.  At 50 ms sample rate, 3 samples = 150 ms.  Short idle
 * blips within continuous hand-pushed motion are bridged over.
 */
const IDLE_DEBOUNCE_SAMPLES = 3;

/** Minimum attachment motor movement to count (degrees). */
const MIN_ATTACHMENT_DEG = 2;

/** Minimum command sizes — below these, motion is noise. */
const MIN_STRAIGHT_MM = 5;
const MIN_TURN_DEG = 3;
const MIN_WAIT_MS = 150;

/**
 * Flush accumulated motion into drive commands.
 * Emits straight (if significant distance) then turn (if significant heading).
 */
function flushMotion(commands: DriveCommand[], dist: number, heading: number): void {
  if (Math.abs(dist) >= MIN_STRAIGHT_MM) {
    commands.push({ type: 'straight', value: Math.round(dist) });
  }
  if (Math.abs(heading) >= MIN_TURN_DEG) {
    commands.push({ type: 'turn', value: Math.round(heading) });
  }
}

function flushAttachments(
  commands: DriveCommand[],
  config: SegmenterConfig,
  att1: number,
  att2: number,
  durationMs: number,
): void {
  if (config.hasAttachment1 && Math.abs(att1) > MIN_ATTACHMENT_DEG) {
    commands.push({
      type: 'attachment',
      value: Math.round(att1),
      attachmentId: 1,
      durationMs,
    });
  }
  if (config.hasAttachment2 && Math.abs(att2) > MIN_ATTACHMENT_DEG) {
    commands.push({
      type: 'attachment',
      value: Math.round(att2),
      attachmentId: 2,
      durationMs,
    });
  }
}

export function segmentToDriveCommands(
  samples: TelemetrySample[],
  config: SegmenterConfig,
): DriveCommand[] {
  if (samples.length < 2) return [];

  const increments = computeIncrements(samples, config);

  // --- Pass 1: binary idle / moving label per sample ---
  const moving: boolean[] = increments.map(
    (inc) => Math.abs(inc.leftDeg) > IDLE_MOTOR_DEG || Math.abs(inc.rightDeg) > IDLE_MOTOR_DEG,
  );

  // --- Pass 2: bridge short idle gaps (< IDLE_DEBOUNCE_SAMPLES) ---
  // Only bridge gaps that are bordered by motion on both sides.
  let i = 0;
  while (i < moving.length) {
    if (!moving[i]) {
      let j = i;
      while (j < moving.length && !moving[j]) j++;
      if (j - i < IDLE_DEBOUNCE_SAMPLES && i > 0 && j < moving.length) {
        for (let k = i; k < j; k++) moving[k] = true;
      }
      i = j;
    } else {
      i++;
    }
  }

  // --- Pass 3: accumulate motion / idle regions and emit commands ---
  const commands: DriveCommand[] = [];
  let accumDist = 0;
  let accumHead = 0;
  let accumAtt1 = 0;
  let accumAtt2 = 0;
  let segDurationMs = 0;
  let accumIdleMs = 0;

  for (let idx = 0; idx < increments.length; idx++) {
    const inc = increments[idx];

    if (!moving[idx]) {
      // Idle sample — flush any pending motion first
      if (segDurationMs > 0) {
        flushMotion(commands, accumDist, accumHead);
        flushAttachments(commands, config, accumAtt1, accumAtt2, segDurationMs);
        accumDist = 0;
        accumHead = 0;
        accumAtt1 = 0;
        accumAtt2 = 0;
        segDurationMs = 0;
      }
      accumIdleMs += inc.dt;
    } else {
      // Moving sample — flush any pending idle first
      if (accumIdleMs > 0) {
        if (accumIdleMs >= MIN_WAIT_MS) {
          commands.push({ type: 'wait', value: accumIdleMs });
        }
        accumIdleMs = 0;
      }
      accumDist += inc.dist;
      accumHead += inc.heading;
      accumAtt1 += inc.att1Delta;
      accumAtt2 += inc.att2Delta;
      segDurationMs += inc.dt;
    }
  }

  // Flush remaining motion
  if (segDurationMs > 0) {
    flushMotion(commands, accumDist, accumHead);
    flushAttachments(commands, config, accumAtt1, accumAtt2, segDurationMs);
  }
  // Flush trailing idle
  if (accumIdleMs >= MIN_WAIT_MS) {
    commands.push({ type: 'wait', value: accumIdleMs });
  }

  return commands;
}

// ---- Code generation ----

function generateDriveReplayCode(commands: DriveCommand[]): string {
  const lines: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'straight':
        lines.push(`robot.straight(${cmd.value})`);
        break;
      case 'turn':
        lines.push(`robot.turn(${cmd.value})`);
        break;
      case 'wait':
        lines.push(`wait(${cmd.value})`);
        break;
      case 'attachment': {
        const name = cmd.attachmentId === 1 ? 'attachment1' : 'attachment2';
        const speed = cmd.durationMs
          ? Math.max(100, Math.round((Math.abs(cmd.value) / cmd.durationMs) * 1000))
          : 200;
        lines.push(`${name}.run_angle(${speed}, ${cmd.value})`);
        break;
      }
    }
  }

  return lines.join('\n');
}

// ---- Summary ----

function buildSummary(
  samples: TelemetrySample[],
  commands: DriveCommand[],
  config: SegmenterConfig,
): RecordedCommand[] {
  if (samples.length < 2) return [];

  const summary: RecordedCommand[] = [];
  const durationMs = samples[samples.length - 1].timestamp - samples[0].timestamp;

  const straights = commands.filter((c) => c.type === 'straight');
  const turns = commands.filter((c) => c.type === 'turn');

  summary.push({
    code: `# ${samples.length} samples, ${commands.length} commands`,
    description: `${(durationMs / 1000).toFixed(1)}s recording — ${straights.length} straight, ${turns.length} turn`,
  });

  // Net distance
  const totalDist = straights.reduce((sum, c) => sum + c.value, 0);
  if (Math.abs(totalDist) >= 5) {
    const dir = totalDist > 0 ? 'forward' : 'backward';
    summary.push({
      code: `# Net distance: ${totalDist}mm`,
      description: `Net ${dir} ${Math.abs(totalDist)}mm`,
    });
  }

  // Net turn
  const totalTurn = turns.reduce((sum, c) => sum + c.value, 0);
  if (Math.abs(totalTurn) >= 2) {
    const dir = totalTurn > 0 ? 'right' : 'left';
    summary.push({
      code: `# Net turn: ${totalTurn} degrees`,
      description: `Net turn ${dir} ${Math.abs(totalTurn)} degrees`,
    });
  }

  // Attachments
  const att1Cmds = commands.filter((c) => c.type === 'attachment' && c.attachmentId === 1);
  if (config.hasAttachment1 && att1Cmds.length > 0) {
    const totalAtt1 = att1Cmds.reduce((sum, c) => sum + c.value, 0);
    summary.push({
      code: `# Attachment 1: ${totalAtt1} degrees`,
      description: `Attachment 1 moved ${totalAtt1} degrees`,
    });
  }

  const att2Cmds = commands.filter((c) => c.type === 'attachment' && c.attachmentId === 2);
  if (config.hasAttachment2 && att2Cmds.length > 0) {
    const totalAtt2 = att2Cmds.reduce((sum, c) => sum + c.value, 0);
    summary.push({
      code: `# Attachment 2: ${totalAtt2} degrees`,
      description: `Attachment 2 moved ${totalAtt2} degrees`,
    });
  }

  return summary;
}

// ---- Legacy: compressSamples (kept for tests) ----

/** Threshold: consecutive samples with all angles unchanged are idle. */
const IDLE_ANGLE_THRESHOLD = 2; // degrees — raised to filter sensor noise

export function compressSamples(
  samples: TelemetrySample[],
  config: SegmenterConfig,
): Array<{ dt: number; left: number; right: number; att1?: number; att2?: number }> {
  if (samples.length < 2) return [];

  const steps: Array<{ dt: number; left: number; right: number; att1?: number; att2?: number }> =
    [];

  let prevLeft = samples[0].leftAngle;
  let prevRight = samples[0].rightAngle;
  let prevAtt1 = samples[0].attachment1Angle ?? 0;
  let prevAtt2 = samples[0].attachment2Angle ?? 0;
  let idleAccum = 0;

  for (let i = 1; i < samples.length; i++) {
    const curr = samples[i];
    const dt = curr.timestamp - samples[i - 1].timestamp;

    const leftChanged = Math.abs(curr.leftAngle - prevLeft) > IDLE_ANGLE_THRESHOLD;
    const rightChanged = Math.abs(curr.rightAngle - prevRight) > IDLE_ANGLE_THRESHOLD;
    const att1Changed =
      config.hasAttachment1 &&
      Math.abs((curr.attachment1Angle ?? 0) - prevAtt1) > IDLE_ANGLE_THRESHOLD;
    const att2Changed =
      config.hasAttachment2 &&
      Math.abs((curr.attachment2Angle ?? 0) - prevAtt2) > IDLE_ANGLE_THRESHOLD;

    const isIdle = !leftChanged && !rightChanged && !att1Changed && !att2Changed;

    if (isIdle) {
      idleAccum += dt;
    } else {
      if (idleAccum > 0) {
        steps.push({
          dt: idleAccum,
          left: prevLeft,
          right: prevRight,
          ...(config.hasAttachment1 ? { att1: prevAtt1 } : {}),
          ...(config.hasAttachment2 ? { att2: prevAtt2 } : {}),
        });
        idleAccum = 0;
      }

      steps.push({
        dt,
        left: curr.leftAngle,
        right: curr.rightAngle,
        ...(config.hasAttachment1 ? { att1: curr.attachment1Angle ?? 0 } : {}),
        ...(config.hasAttachment2 ? { att2: curr.attachment2Angle ?? 0 } : {}),
      });

      prevLeft = curr.leftAngle;
      prevRight = curr.rightAngle;
      prevAtt1 = curr.attachment1Angle ?? 0;
      prevAtt2 = curr.attachment2Angle ?? 0;
    }
  }

  if (idleAccum > 0) {
    steps.push({
      dt: idleAccum,
      left: prevLeft,
      right: prevRight,
      ...(config.hasAttachment1 ? { att1: prevAtt1 } : {}),
      ...(config.hasAttachment2 ? { att2: prevAtt2 } : {}),
    });
  }

  return steps;
}

// ---- Main entry point ----

export function processRecording(
  samples: TelemetrySample[],
  config: SegmenterConfig,
): ReplayResult | null {
  if (samples.length < 2) return null;

  const commands = segmentToDriveCommands(samples, config);
  if (commands.length === 0) return null;

  const durationMs = samples[samples.length - 1].timestamp - samples[0].timestamp;

  return {
    replayCode: generateDriveReplayCode(commands),
    summary: buildSummary(samples, commands, config),
    sampleCount: samples.length,
    durationMs,
  };
}
