import type { TelemetrySample } from '../../types/recording';

/**
 * Stateful parser that buffers BLE stdout chunks and extracts complete
 * telemetry lines. BLE notifications may split lines at arbitrary byte
 * boundaries, so we buffer until we see a newline.
 */
export class TelemetryParser {
  private buffer = '';
  private ready = false;

  /** Whether we have received the READY signal from the hub. */
  isReady(): boolean {
    return this.ready;
  }

  /** Reset internal state for a new recording session. */
  reset(): void {
    this.buffer = '';
    this.ready = false;
  }

  /**
   * Feed a raw stdout chunk from BLE. Returns any complete telemetry
   * samples parsed from the buffered data.
   */
  feed(chunk: string): TelemetrySample[] {
    this.buffer += chunk;
    const samples: TelemetrySample[] = [];

    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);

      if (!line) continue;

      // Check for READY signal
      if (line === 'READY') {
        this.ready = true;
        continue;
      }

      // Parse telemetry line: D,timestamp,leftAngle,rightAngle[,att1][,att2]
      if (!line.startsWith('D,')) continue;

      const parts = line.slice(2).split(',');
      if (parts.length < 3) continue;

      const timestamp = parseInt(parts[0], 10);
      const leftAngle = parseInt(parts[1], 10);
      const rightAngle = parseInt(parts[2], 10);

      if (isNaN(timestamp) || isNaN(leftAngle) || isNaN(rightAngle)) continue;

      const sample: TelemetrySample = { timestamp, leftAngle, rightAngle };

      if (parts.length > 3) {
        const att1 = parseInt(parts[3], 10);
        if (!isNaN(att1)) sample.attachment1Angle = att1;
      }

      if (parts.length > 4) {
        const att2 = parseInt(parts[4], 10);
        if (!isNaN(att2)) sample.attachment2Angle = att2;
      }

      samples.push(sample);
    }

    return samples;
  }
}
