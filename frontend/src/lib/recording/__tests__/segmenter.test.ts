import { describe, it, expect } from 'vitest';
import { processRecording, compressSamples, segmentToDriveCommands } from '../segmenter';
import type { SegmenterConfig } from '../segmenter';
import type { TelemetrySample } from '../../../types/recording';

const defaultConfig: SegmenterConfig = {
  wheelDiameter: 56,
  axleTrack: 112,
  hasAttachment1: false,
  hasAttachment2: false,
};

function makeSamples(data: Array<[number, number, number]>): TelemetrySample[] {
  return data.map(([timestamp, leftAngle, rightAngle]) => ({
    timestamp,
    leftAngle,
    rightAngle,
  }));
}

describe('compressSamples (legacy)', () => {
  it('returns empty for fewer than 2 samples', () => {
    expect(compressSamples([], defaultConfig)).toEqual([]);
    expect(
      compressSamples([{ timestamp: 0, leftAngle: 0, rightAngle: 0 }], defaultConfig),
    ).toEqual([]);
  });

  it('preserves every moving sample at full resolution', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 10, 12],
      [100, 25, 30],
      [150, 40, 45],
    ]);
    const steps = compressSamples(samples, defaultConfig);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ dt: 50, left: 10, right: 12 });
    expect(steps[1]).toEqual({ dt: 50, left: 25, right: 30 });
    expect(steps[2]).toEqual({ dt: 50, left: 40, right: 45 });
  });

  it('compresses consecutive idle samples into a single wait', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 10, 10], // movement
      [100, 10, 10], // idle
      [150, 10, 10], // idle
      [200, 10, 10], // idle
      [250, 20, 20], // movement resumes
    ]);
    const steps = compressSamples(samples, defaultConfig);
    // Should be: move(50ms), idle(150ms), move(50ms)
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ dt: 50, left: 10, right: 10 });
    expect(steps[1].dt).toBe(150); // compressed idle
    expect(steps[1].left).toBe(10);
    expect(steps[2]).toEqual({ dt: 50, left: 20, right: 20 });
  });

  it('preserves absolute angles (not deltas)', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 100, -50],
      [100, 200, -100],
    ]);
    const steps = compressSamples(samples, defaultConfig);
    expect(steps[0].left).toBe(100);
    expect(steps[0].right).toBe(-50);
    expect(steps[1].left).toBe(200);
    expect(steps[1].right).toBe(-100);
  });
});

describe('segmentToDriveCommands', () => {
  it('returns empty for fewer than 2 samples', () => {
    expect(segmentToDriveCommands([], defaultConfig)).toEqual([]);
    expect(
      segmentToDriveCommands([{ timestamp: 0, leftAngle: 0, rightAngle: 0 }], defaultConfig),
    ).toEqual([]);
  });

  it('detects a straight movement', () => {
    // Both motors turn equally → forward motion
    const samples = makeSamples([
      [0, 0, 0],
      [50, 20, 20],
      [100, 40, 40],
      [150, 60, 60],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    const straights = cmds.filter((c) => c.type === 'straight');
    expect(straights.length).toBe(1);
    expect(straights[0].value).toBeGreaterThan(0);
    expect(cmds.filter((c) => c.type === 'turn')).toHaveLength(0);
  });

  it('detects a turn in place', () => {
    // Left motor forward, right motor backward → right turn
    const samples = makeSamples([
      [0, 0, 0],
      [50, 20, -20],
      [100, 40, -40],
      [150, 60, -60],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    const turns = cmds.filter((c) => c.type === 'turn');
    expect(turns.length).toBe(1);
    expect(turns[0].value).toBeGreaterThan(0); // positive = right turn
  });

  it('detects straight then turn', () => {
    const samples = makeSamples([
      [0, 0, 0],
      // Straight forward
      [50, 20, 20],
      [100, 40, 40],
      [150, 60, 60],
      // Pause (>= IDLE_DEBOUNCE_SAMPLES = 3 idle samples needed)
      [200, 60, 60],
      [250, 60, 60],
      [300, 60, 60],
      [350, 60, 60],
      // Turn right (left forward, right backward)
      [400, 80, 40],
      [450, 100, 20],
      [500, 120, 0],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    const types = cmds.map((c) => c.type);
    expect(types).toContain('straight');
    expect(types).toContain('turn');
  });

  it('produces wait commands for idle periods', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 20, 20],
      // Long idle (well above debounce threshold)
      [100, 20, 20],
      [150, 20, 20],
      [200, 20, 20],
      [250, 20, 20],
      [300, 20, 20],
      [350, 40, 40],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    expect(cmds.some((c) => c.type === 'wait')).toBe(true);
  });

  it('handles all-idle recording', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 0, 0],
      [100, 0, 0],
      [150, 0, 0],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    // All idle — either empty or a single wait
    const motionCmds = cmds.filter((c) => c.type !== 'wait');
    expect(motionCmds).toHaveLength(0);
  });

  it('includes attachment commands when configured', () => {
    const samples: TelemetrySample[] = [
      { timestamp: 0, leftAngle: 0, rightAngle: 0, attachment1Angle: 0 },
      { timestamp: 50, leftAngle: 20, rightAngle: 20, attachment1Angle: 30 },
      { timestamp: 100, leftAngle: 40, rightAngle: 40, attachment1Angle: 60 },
    ];
    const config = { ...defaultConfig, hasAttachment1: true };
    const cmds = segmentToDriveCommands(samples, config);
    expect(cmds.some((c) => c.type === 'attachment' && c.attachmentId === 1)).toBe(true);
  });

  it('bridges short idle gaps during continuous motion', () => {
    // Robot moving with a 1-sample idle blip in the middle — should NOT produce a wait
    const samples = makeSamples([
      [0, 0, 0],
      [50, 20, 20],
      [100, 40, 40],
      [150, 40, 40], // 1 idle sample (below debounce threshold of 3)
      [200, 60, 60],
      [250, 80, 80],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    expect(cmds.filter((c) => c.type === 'wait')).toHaveLength(0);
    // All motion should be in a single straight command
    const straights = cmds.filter((c) => c.type === 'straight');
    expect(straights.length).toBe(1);
  });

  it('detects slow turns that were previously classified as idle', () => {
    // Slow spot turn: motors move ~1° per sample (was below old 2° threshold)
    const samples = makeSamples([
      [0, 0, 0],
      [50, 1, -1],
      [100, 2, -2],
      [150, 3, -3],
      [200, 4, -4],
      [250, 5, -5],
      [300, 6, -6],
      [350, 7, -7],
      [400, 8, -8],
      [450, 9, -9],
      [500, 10, -10],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    const turns = cmds.filter((c) => c.type === 'turn');
    expect(turns.length).toBeGreaterThan(0);
    // Should NOT produce any wait commands
    expect(cmds.filter((c) => c.type === 'wait')).toHaveLength(0);
  });

  it('accumulates curve motion as straight + turn', () => {
    // Arc: left wheel faster than right → curves right
    const samples = makeSamples([
      [0, 0, 0],
      [50, 30, 10],
      [100, 60, 20],
      [150, 90, 30],
    ]);
    const cmds = segmentToDriveCommands(samples, defaultConfig);
    // Should produce both straight and turn from the accumulated motion
    expect(cmds.some((c) => c.type === 'straight')).toBe(true);
    expect(cmds.some((c) => c.type === 'turn')).toBe(true);
  });
});

describe('processRecording', () => {
  it('returns null for fewer than 2 samples', () => {
    expect(processRecording([], defaultConfig)).toBeNull();
    expect(
      processRecording([{ timestamp: 0, leftAngle: 0, rightAngle: 0 }], defaultConfig),
    ).toBeNull();
  });

  it('generates replay code with robot.straight and robot.turn', () => {
    // Straight then turn
    const samples = makeSamples([
      [0, 0, 0],
      [50, 20, 20],
      [100, 40, 40],
      [150, 60, 60],
      // idle (>= 3 samples to clear debounce)
      [200, 60, 60],
      [250, 60, 60],
      [300, 60, 60],
      [350, 60, 60],
      // turn
      [400, 80, 40],
      [450, 100, 20],
      [500, 120, 0],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.replayCode).toContain('robot.straight(');
    expect(result!.replayCode).toContain('robot.turn(');
  });

  it('uses robot.straight for forward motion', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 30, 30],
      [100, 60, 60],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.replayCode).toContain('robot.straight(');
    expect(result!.replayCode).not.toContain('robot.turn(');
  });

  it('uses robot.turn for in-place rotation', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 30, -30],
      [100, 60, -60],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.replayCode).toContain('robot.turn(');
  });

  it('includes attachment run_angle when configured', () => {
    const samples: TelemetrySample[] = [
      { timestamp: 0, leftAngle: 0, rightAngle: 0, attachment1Angle: 0, attachment2Angle: 0 },
      { timestamp: 50, leftAngle: 20, rightAngle: 20, attachment1Angle: 30, attachment2Angle: 15 },
      {
        timestamp: 100,
        leftAngle: 40,
        rightAngle: 40,
        attachment1Angle: 60,
        attachment2Angle: 30,
      },
    ];
    const config = { ...defaultConfig, hasAttachment1: true, hasAttachment2: true };
    const result = processRecording(samples, config);
    expect(result).not.toBeNull();
    expect(result!.replayCode).toContain('attachment1.run_angle(');
    expect(result!.replayCode).toContain('attachment2.run_angle(');
  });

  it('produces a summary with duration and command counts', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 50, 50],
      [100, 100, 100],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.summary.length).toBeGreaterThanOrEqual(1);
    expect(result!.sampleCount).toBe(3);
    expect(result!.durationMs).toBe(100);
  });

  it('reports net distance in summary', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 100, 100],
      [100, 200, 200],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    const desc = result!.summary.map((s) => s.description).join(' ');
    expect(desc).toContain('forward');
  });

  it('reports net turn in summary', () => {
    const samples = makeSamples([
      [0, 0, 0],
      [50, 100, -100],
    ]);
    const result = processRecording(samples, defaultConfig);
    expect(result).not.toBeNull();
    const desc = result!.summary.map((s) => s.description).join(' ');
    expect(desc).toMatch(/turn/i);
  });
});
