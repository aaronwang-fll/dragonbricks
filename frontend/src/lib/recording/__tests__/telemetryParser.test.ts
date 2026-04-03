import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryParser } from '../telemetryParser';

describe('TelemetryParser', () => {
  let parser: TelemetryParser;

  beforeEach(() => {
    parser = new TelemetryParser();
  });

  it('parses a complete telemetry line', () => {
    const samples = parser.feed('D,100,45,-30\n');
    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      timestamp: 100,
      leftAngle: 45,
      rightAngle: -30,
    });
  });

  it('handles split chunks across BLE notifications', () => {
    const s1 = parser.feed('D,100,4');
    expect(s1).toHaveLength(0);

    const s2 = parser.feed('5,-30\n');
    expect(s2).toHaveLength(1);
    expect(s2[0]).toEqual({
      timestamp: 100,
      leftAngle: 45,
      rightAngle: -30,
    });
  });

  it('parses multiple lines in one chunk', () => {
    const samples = parser.feed('D,100,10,20\nD,150,15,25\n');
    expect(samples).toHaveLength(2);
    expect(samples[0].timestamp).toBe(100);
    expect(samples[1].timestamp).toBe(150);
  });

  it('ignores non-telemetry lines', () => {
    const samples = parser.feed('Some debug output\nD,100,10,20\nAnother line\n');
    expect(samples).toHaveLength(1);
    expect(samples[0].timestamp).toBe(100);
  });

  it('detects READY signal', () => {
    expect(parser.isReady()).toBe(false);
    parser.feed('READY\n');
    expect(parser.isReady()).toBe(true);
  });

  it('parses attachment motor angles', () => {
    const samples = parser.feed('D,100,10,20,30\n');
    expect(samples).toHaveLength(1);
    expect(samples[0].attachment1Angle).toBe(30);
    expect(samples[0].attachment2Angle).toBeUndefined();
  });

  it('parses both attachment motor angles', () => {
    const samples = parser.feed('D,100,10,20,30,40\n');
    expect(samples).toHaveLength(1);
    expect(samples[0].attachment1Angle).toBe(30);
    expect(samples[0].attachment2Angle).toBe(40);
  });

  it('skips malformed telemetry lines', () => {
    const samples = parser.feed('D,abc,10,20\nD,100,xyz,20\nD,100\nD,100,10,20\n');
    expect(samples).toHaveLength(1);
    expect(samples[0].timestamp).toBe(100);
  });

  it('resets state correctly', () => {
    parser.feed('READY\n');
    parser.feed('D,100,10,');
    expect(parser.isReady()).toBe(true);

    parser.reset();
    expect(parser.isReady()).toBe(false);

    // Partial buffer should be cleared
    const samples = parser.feed('20\n');
    expect(samples).toHaveLength(0); // "20\n" alone is not a valid telemetry line
  });

  it('handles empty chunks', () => {
    const samples = parser.feed('');
    expect(samples).toHaveLength(0);
  });

  it('handles carriage return line endings', () => {
    const samples = parser.feed('D,100,10,20\r\n');
    expect(samples).toHaveLength(1);
    expect(samples[0].timestamp).toBe(100);
  });
});
