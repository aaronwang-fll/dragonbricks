/**
 * Singleton recording service. Holds the mutable state (parser, sample
 * buffer, timer, BLE listener) at module level so that multiple React
 * components can safely share the same recording session.
 */

import { useRecordingStore } from '../../stores/recordingStore';
import { useEditorStore } from '../../stores/editorStore';
import { useConsoleStore } from '../../stores/consoleStore';
import {
  uploadProgram,
  startProgram,
  stopProgram as bleStopProgram,
  addOutputListener,
  removeOutputListener,
  isConnected as bleIsConnected,
} from '../bluetooth/pybricks';
import { generateTelemetryProgram } from './telemetryProgram';
import { TelemetryParser } from './telemetryParser';
import { processRecording } from './segmenter';
import type { TelemetrySample, TelemetryPortConfig } from '../../types/recording';
import type { Routine } from '../../types';

// ---- Module-level singleton state ----
const parser = new TelemetryParser();
let samples: TelemetrySample[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let startTime = 0;
let outputListener: ((output: string) => void) | null = null;
let hubErrorOutput = ''; // Capture any non-telemetry output for error reporting

// ---- Helpers ----
function getStore() {
  return useRecordingStore.getState();
}

function getEditorStore() {
  return useEditorStore.getState();
}

function getConsoleStore() {
  return useConsoleStore.getState();
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function removeListener() {
  if (outputListener) {
    removeOutputListener(outputListener);
    outputListener = null;
  }
}

function cleanupBle() {
  removeListener();
  stopTimer();
}

function getPortConfig(): TelemetryPortConfig | null {
  const { defaults } = getEditorStore();
  const left = defaults.leftMotorPort;
  const right = defaults.rightMotorPort;
  if (!left || left === 'None' || !right || right === 'None') {
    return null;
  }
  return {
    leftMotorPort: left,
    rightMotorPort: right,
    attachment1Port: defaults.attachment1Port !== 'None' ? defaults.attachment1Port : undefined,
    attachment2Port: defaults.attachment2Port !== 'None' ? defaults.attachment2Port : undefined,
  };
}

// ---- Public API ----

export function processAndShow(recordedSamples: TelemetrySample[]): void {
  const store = getStore();
  const { defaults } = getEditorStore();
  store.setPhase('processing');

  const config = {
    wheelDiameter: defaults.wheelDiameter || 56,
    axleTrack: defaults.axleTrack || 112,
    hasAttachment1: defaults.attachment1Port !== 'None',
    hasAttachment2: defaults.attachment2Port !== 'None',
  };

  const result = processRecording(recordedSamples, config);

  if (!result) {
    store.setError('No significant movements detected. Try larger movements.');
    store.setPhase('idle');
    return;
  }

  store.setSampleCount(recordedSamples.length);
  store.setCommands(result.summary);
  store.setReplayCode(result.replayCode);
  store.setRoutineName(`recording_${Date.now()}`);
  store.setShowSaveDialog(true);
  store.setPhase('saving');
}

export async function startRecording(): Promise<void> {
  const store = getStore();

  if (!bleIsConnected()) {
    store.setError('Connect to hub first');
    return;
  }

  const portConfig = getPortConfig();
  if (!portConfig) {
    store.setError('Configure motor ports in Setup first');
    return;
  }

  // Reset
  store.reset();
  store.setPhase('uploading');
  parser.reset();
  samples = [];

  getConsoleStore().addStatus('Preparing recording...');

  // Generate and upload telemetry program
  const program = generateTelemetryProgram(portConfig);

  // Set up output listener — samples are collected into the module-level
  // array only; no per-sample Zustand updates. The timer below syncs the
  // count to the store periodically.
  hubErrorOutput = '';
  const listener = (output: string) => {
    const parsed = parser.feed(output);
    for (const sample of parsed) {
      samples.push(sample);
    }
    // Capture non-telemetry output for error reporting (e.g. hub tracebacks)
    const nonTelemetry = output
      .split('\n')
      .filter((l) => {
        const t = l.trim();
        return t !== '' && !t.startsWith('D,') && t !== 'READY';
      })
      .join('\n');
    if (nonTelemetry) {
      hubErrorOutput += nonTelemetry + '\n';
    }
  };
  outputListener = listener;
  addOutputListener(listener);

  const uploaded = await uploadProgram(program);
  if (!uploaded) {
    cleanupBle();
    store.setError('Failed to upload telemetry program');
    store.setPhase('idle');
    return;
  }

  const started = await startProgram();
  if (!started) {
    cleanupBle();
    store.setError('Failed to start telemetry program');
    store.setPhase('idle');
    return;
  }

  // Wait for the hub program to print "READY" (up to 3 seconds).
  // If the program crashes, we'll see error output instead.
  const readyTimeout = 3000;
  const readyStart = Date.now();
  while (!parser.isReady() && Date.now() - readyStart < readyTimeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!parser.isReady()) {
    cleanupBle();
    const errMsg = hubErrorOutput.trim();
    if (errMsg) {
      store.setError(`Hub program failed: ${errMsg.slice(0, 200)}`);
      getConsoleStore().addStatus(`Hub error: ${errMsg}`);
    } else {
      store.setError('Hub program did not start. Check motor ports and firmware.');
    }
    store.setPhase('idle');
    return;
  }

  // Start elapsed timer — also syncs sample count so the UI can show
  // progress without per-sample re-renders.
  startTime = Date.now();
  timer = setInterval(() => {
    const s = getStore();
    s.setElapsedMs(Date.now() - startTime);
    s.setSampleCount(samples.length);
  }, 250);

  store.setPhase('recording');
  getConsoleStore().addStatus('Recording... Push the robot around!');
}

export async function stopRecording(): Promise<void> {
  const store = getStore();

  // 1. Stop the timer immediately (UI stops counting)
  stopTimer();
  store.setPhase('processing');
  getConsoleStore().addStatus('Recording stopped. Processing...');

  // 2. Stop the hub program (it will stop generating new data)
  await bleStopProgram();

  // 3. Wait for buffered BLE notifications to flush through.
  //    The listener stays active during this window so we capture
  //    any remaining telemetry that was in-flight.
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 4. Now remove the listener — all buffered data has arrived
  removeListener();

  if (samples.length < 2) {
    const errMsg = hubErrorOutput.trim();
    if (errMsg) {
      store.setError(`Recording failed — hub error: ${errMsg.slice(0, 200)}`);
      getConsoleStore().addStatus(`Hub error output: ${errMsg}`);
    } else {
      store.setError(`Recording too short (${samples.length} samples). Move the robot more.`);
    }
    store.setPhase('idle');
    return;
  }

  processAndShow(samples);
}

export function handleDisconnect(): void {
  const store = getStore();
  const { phase } = store;

  if (phase !== 'recording' && phase !== 'uploading') return;

  cleanupBle();

  if (samples.length >= 2) {
    processAndShow(samples);
  } else {
    store.setError('Hub disconnected. Recording too short.');
    store.setPhase('idle');
  }
}

export function saveRecording(name: string, replayCode: string): void {
  const { currentProgram, updateProgram } = getEditorStore();
  const store = getStore();

  if (!currentProgram) {
    store.setError('No active program. Create a program first.');
    return;
  }

  // Sanitize name
  const sanitized =
    name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '') || 'recorded_routine';

  // Check for name collision
  const existingNames = new Set(currentProgram.routines.map((r) => r.name));
  let finalName = sanitized;
  let counter = 1;
  while (existingNames.has(finalName)) {
    finalName = `${sanitized}_${counter}`;
    counter++;
  }

  const newRoutine: Routine = {
    id: `routine-${Date.now()}`,
    name: finalName,
    parameters: [],
    body: replayCode,
  };

  updateProgram(currentProgram.id, {
    routines: [...currentProgram.routines, newRoutine],
  });

  // Expand the routines section so the user sees the new routine
  getEditorStore().setShowRoutines(true);

  getConsoleStore().addStatus(`Saved recording as routine "${finalName}"`);
  store.reset();
}

export function discardRecording(): void {
  getStore().reset();
}
