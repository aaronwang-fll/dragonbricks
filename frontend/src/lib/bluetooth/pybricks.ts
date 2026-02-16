// Web Bluetooth types (available in browsers that support it)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BluetoothDeviceType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BluetoothCharacteristicType = any;

/**
 * Pybricks BLE protocol implementation.
 *
 * This module was rewritten to match the end-to-end behavior of Pybricks Code.
 * Key fixes vs the previous implementation:
 *
 * 1) Notifications and message format
 *    The Pybricks Control/Event characteristic (UUID ...0002) sends *events*.
 *    The first byte is an EventType, not a status bitfield. StatusReport is:
 *      [0]=EventType (0)
 *      [1..4]=flags (uint32 LE)
 *      [5]=running program id (v1.4+)
 *      [6]=selected slot (v1.5+)
 *
 * 2) Download/write sequence
 *    Pybricks Code invalidates the existing user program before downloading:
 *      - WriteUserProgramMeta(size=0)
 *      - WriteUserRam(offset, chunk) ...
 *      - WriteUserProgramMeta(size=final)
 *    Some hubs/firmware will reject writes (or get into a busy state) if we
 *    skip the initial meta=0 step or race a running program.
 *
 * 3) Start command format
 *    On Pybricks Profile v1.4+, StartUserProgram includes a program/slot id:
 *      [0]=StartUserProgram (1), [1]=slot
 *    Older firmware used a 1-byte legacy start.
 *
 * 4) Chunk size
 *    We respect the hub's reported maxWriteSize (hub capabilities char ...0003)
 *    when available. The user-RAM write message has a 5-byte header, so:
 *      chunkSize = maxWriteSize - 5
 */

// ===== GATT UUIDs =====
const PYBRICKS_SERVICE_UUID = 'c5f50001-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_CONTROL_CHAR_UUID = 'c5f50002-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_HUB_CHAR_UUID = 'c5f50003-8280-46da-89f4-6d8051e4aeef';

// ===== Commands (Control characteristic writes) =====
// NOTE: This project uses TS "erasableSyntaxOnly", so we avoid enums.
const CommandType = {
  StopUserProgram: 0,
  StartUserProgram: 1,
  StartRepl: 2, // legacy, removed in profile v1.4
  WriteUserProgramMeta: 3,
  WriteUserRam: 4,
  ResetInUpdateMode: 5,
  WriteStdin: 6,
  WriteAppData: 7,
} as const;

// ===== Events (Control characteristic notifications) =====
const EventType = {
  StatusReport: 0,
  WriteStdout: 1,
  WriteAppData: 2,
} as const;

// Status flags bit positions (StatusReport flags is uint32 bitset)
const StatusBit = {
  BatteryLowVoltageWarning: 0,
  BatteryLowVoltageShutdown: 1,
  BatteryHighCurrent: 2,
  BLEAdvertising: 3,
  BLELowSignal: 4,
  PowerButtonPressed: 5,
  UserProgramRunning: 6,
  Shutdown: 7,
} as const;

type StatusBitKey = keyof typeof StatusBit;

function statusToFlag(bit: StatusBitKey): number {
  return 1 << StatusBit[bit];
}

export interface PybricksHub {
  device: BluetoothDeviceType;
  controlChar: BluetoothCharacteristicType;
  hubChar: BluetoothCharacteristicType;
  isConnected: boolean;

  // From Hub Capabilities characteristic (when available)
  maxWriteSize?: number;
  maxUserProgramSize?: number;
  capabilityFlags?: number;
  numSlots?: number;
}

export interface HubStatus {
  batteryLow: boolean;
  batteryCritical: boolean;
  highCurrent: boolean;
  advertising: boolean;
  lowSignal: boolean;
  buttonPressed: boolean;
  programRunning: boolean;
  shutdown: boolean;

  // Present on newer profiles (v1.4+ / v1.5+)
  runningProgId?: number;
  selectedSlot?: number;
}

export type ConnectionCallback = (
  status: 'connected' | 'disconnected' | 'error',
  error?: string
) => void;
export type OutputCallback = (output: string) => void;
export type StatusCallback = (status: HubStatus) => void;

let currentHub: PybricksHub | null = null;
let outputCallback: OutputCallback | null = null;
let statusCallback: StatusCallback | null = null;

let lastStatus: HubStatus | null = null;
let statusWaiters: Array<(s: HubStatus) => void> = [];

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as unknown as Record<string, unknown>);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== BLE Operation Queue =====
// Web Bluetooth only allows one GATT operation at a time.
// We serialize all write operations through this queue.
let bleOperationQueue: Promise<void> = Promise.resolve();

async function queueBleWrite(
  char: BluetoothCharacteristicType,
  data: Uint8Array,
  description: string
): Promise<void> {
  // Chain this operation onto the queue
  const operation = bleOperationQueue.then(async () => {
    console.log(`[Pybricks] BLE write: ${description}, ${data.length} bytes`);
    try {
      await char.writeValueWithResponse(data.buffer);
      console.log(`[Pybricks] BLE write success: ${description}`);
    } catch (err) {
      console.error(`[Pybricks] BLE write failed: ${description}`, err);
      throw err;
    }
    // Small delay between operations to let the hub process
    await delay(20);
  });
  
  // Update the queue to include this operation (whether it succeeds or fails)
  bleOperationQueue = operation.catch(() => {});
  
  // Wait for this specific operation to complete
  return operation;
}

function createStopUserProgramCommand(): Uint8Array {
  return new Uint8Array([CommandType.StopUserProgram]);
}

function createStartUserProgramCommand(slot: number): Uint8Array {
  return new Uint8Array([CommandType.StartUserProgram, slot & 0xff]);
}

function createLegacyStartUserProgramCommand(): Uint8Array {
  return new Uint8Array([CommandType.StartUserProgram]);
}

function createWriteUserProgramMetaCommand(size: number): Uint8Array {
  const msg = new Uint8Array(5);
  const view = new DataView(msg.buffer);
  view.setUint8(0, CommandType.WriteUserProgramMeta);
  view.setUint32(1, size >>> 0, true);
  return msg;
}

function createWriteUserRamCommand(offset: number, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(5 + payload.byteLength);
  const view = new DataView(msg.buffer);
  view.setUint8(0, CommandType.WriteUserRam);
  view.setUint32(1, offset >>> 0, true);
  msg.set(payload, 5);
  return msg;
}

function createWriteStdinCommand(payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(1 + payload.byteLength);
  msg[0] = CommandType.WriteStdin;
  msg.set(payload, 1);
  return msg;
}

async function writeControl(value: Uint8Array, description = 'command'): Promise<void> {
  if (!currentHub) throw new Error('No hub connected');
  const ch = currentHub.controlChar;

  // Use the BLE operation queue to serialize writes
  return queueBleWrite(ch, value, description);
}

function parseStatusReport(msg: DataView): HubStatus {
  // msg[0]=EventType
  const flags = msg.getUint32(1, true);
  const runningProgId = msg.byteLength > 5 ? msg.getUint8(5) : undefined;
  const selectedSlot = msg.byteLength > 6 ? msg.getUint8(6) : undefined;

  return {
    batteryLow: (flags & statusToFlag('BatteryLowVoltageWarning')) !== 0,
    batteryCritical: (flags & statusToFlag('BatteryLowVoltageShutdown')) !== 0,
    highCurrent: (flags & statusToFlag('BatteryHighCurrent')) !== 0,
    advertising: (flags & statusToFlag('BLEAdvertising')) !== 0,
    lowSignal: (flags & statusToFlag('BLELowSignal')) !== 0,
    buttonPressed: (flags & statusToFlag('PowerButtonPressed')) !== 0,
    programRunning: (flags & statusToFlag('UserProgramRunning')) !== 0,
    shutdown: (flags & statusToFlag('Shutdown')) !== 0,
    runningProgId,
    selectedSlot,
  };
}

function handleControlNotification(event: Event): void {
  const target = event.target as BluetoothCharacteristicType;
  const value = target.value as DataView | null | undefined;
  if (!value) return;

  const eventType = value.getUint8(0);

  if (eventType === EventType.StatusReport) {
    const status = parseStatusReport(value);
    lastStatus = status;
    if (statusCallback) statusCallback(status);

    // Resolve any one-shot waiters
    const waiters = statusWaiters;
    statusWaiters = [];
    waiters.forEach((fn) => fn(status));

    return;
  }

  if (eventType === EventType.WriteStdout) {
    const bytes = value.buffer.slice(1);
    const output = new TextDecoder().decode(bytes);
    if (outputCallback && output) outputCallback(output);
    return;
  }

  if (eventType === EventType.WriteAppData) {
    // Not used by DragonBricks currently.
    return;
  }

  // Unknown event type: ignore
}

async function waitForStatus(predicate: (s: HubStatus) => boolean, timeoutMs: number): Promise<boolean> {
  if (lastStatus && predicate(lastStatus)) return true;

  return await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      // Remove waiter if still present
      statusWaiters = statusWaiters.filter((w) => w !== waiter);
      resolve(false);
    }, timeoutMs);

    const waiter = (s: HubStatus): void => {
      if (predicate(s)) {
        clearTimeout(timer);
        resolve(true);
      } else {
        // keep waiting for the next status report
        statusWaiters.push(waiter);
      }
    };

    statusWaiters.push(waiter);
  });
}

export async function connectToHub(
  onConnection: ConnectionCallback,
  onOutput?: OutputCallback,
  onStatus?: StatusCallback
): Promise<PybricksHub | null> {
  if (!isBluetoothSupported()) {
    onConnection('error', 'Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  // Reset state for new connection
  outputCallback = onOutput || null;
  statusCallback = onStatus || null;
  lastStatus = null;
  statusWaiters = [];
  bleOperationQueue = Promise.resolve(); // Reset the BLE operation queue

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bluetooth = (navigator as any).bluetooth;

    const available = (await bluetooth.getAvailability?.()) ?? true;
    if (!available) {
      onConnection('error', 'Bluetooth is not available. Please enable Bluetooth on your device.');
      return null;
    }

    // Request a Pybricks hub.
    let device: BluetoothDeviceType;
    try {
      device = await bluetooth.requestDevice({
        filters: [{ services: [PYBRICKS_SERVICE_UUID] }],
        optionalServices: [PYBRICKS_SERVICE_UUID],
      });
    } catch (requestError) {
      const msg = requestError instanceof Error ? requestError.message : '';
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        onConnection('error', 'Connection cancelled by user.');
      } else {
        onConnection('error', `Could not find hub: ${msg}`);
      }
      return null;
    }

    if (!device.gatt) {
      onConnection('error', 'GATT not available on this device.');
      return null;
    }

    // Connect.
    let server;
    try {
      server = await device.gatt.connect();
      // Give the OS Bluetooth stack time to settle (Pybricks Code does this).
      await delay(1000);
    } catch (gattError) {
      const msg = gattError instanceof Error ? gattError.message : String(gattError);
      onConnection('error', `GATT connection failed: ${msg}`);
      return null;
    }

    // Service + characteristics.
    const service = await server.getPrimaryService(PYBRICKS_SERVICE_UUID);
    const controlChar = await service.getCharacteristic(PYBRICKS_CONTROL_CHAR_UUID);
    const hubChar = await service.getCharacteristic(PYBRICKS_HUB_CHAR_UUID);

    // Notifications are on the Control/Event characteristic.
    try {
      try {
        await controlChar.stopNotifications();
      } catch {
        // ignore
      }
      await controlChar.startNotifications();
      controlChar.addEventListener('characteristicvaluechanged', handleControlNotification);
    } catch (err) {
      // If we can't enable notifications, downloads may still work, but we lose
      // status/stdout. Keep connecting.
      console.warn('[Pybricks] Failed to start notifications on control char:', err);
    }

    // Read hub capabilities (if supported by the firmware/profile).
    let maxWriteSize: number | undefined;
    let flags: number | undefined;
    let maxUserProgramSize: number | undefined;
    let numSlots: number | undefined;

    try {
      if (hubChar.properties?.read) {
        const caps = await hubChar.readValue();
        // Profile v1.2.0+ layout:
        // 0..1 maxWriteSize (u16 LE)
        // 2..5 flags (u32 LE)
        // 6..9 maxUserProgramSize (u32 LE)
        // 10 numSlots (u8) (v1.5.0+)
        if (caps.byteLength >= 10) {
          maxWriteSize = caps.getUint16(0, true);
          flags = caps.getUint32(2, true);
          maxUserProgramSize = caps.getUint32(6, true);
          if (caps.byteLength >= 11) numSlots = caps.getUint8(10);
        }
      }
    } catch (err) {
      // Older firmware may not have this characteristic or it may not be readable.
      console.log('[Pybricks] Could not read hub capabilities:', err);
    }

    device.addEventListener('gattserverdisconnected', () => {
      currentHub = null;
      lastStatus = null;
      statusWaiters = [];
      bleOperationQueue = Promise.resolve();
      onConnection('disconnected');
    });

    currentHub = {
      device,
      controlChar,
      hubChar,
      isConnected: true,
      maxWriteSize,
      maxUserProgramSize,
      capabilityFlags: flags,
      numSlots,
    };

    onConnection('connected');
    return currentHub;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onConnection('error', `Connection failed: ${message}`);
    return null;
  }
}

export async function disconnectFromHub(): Promise<void> {
  if (currentHub?.device.gatt?.connected) {
    currentHub.device.gatt.disconnect();
  }
  currentHub = null;
  lastStatus = null;
  statusWaiters = [];
  bleOperationQueue = Promise.resolve();
}

/**
 * Uploads a program to slot 0 by default.
 *
 * Implements the same high-level flow as Pybricks Code:
 *  - stop
 *  - write meta size=0
 *  - write user RAM chunks
 *  - write meta size=final
 */
export async function uploadProgram(program: string): Promise<boolean> {
  if (!currentHub) {
    console.error('[Pybricks] No hub connected');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(program);

    // Safety check if we know max program size.
    if (currentHub.maxUserProgramSize !== undefined && programBytes.length > currentHub.maxUserProgramSize) {
      throw new Error(`Program is too large (${programBytes.length} bytes). Max is ${currentHub.maxUserProgramSize} bytes.`);
    }

    // Stop any running program first.
    await stopProgram();

    // Prefer waiting for a status report that says the program is not running.
    // If notifications aren't working, we fall back to a small delay.
    const stopped = await waitForStatus((s) => !s.programRunning, 2000);
    if (!stopped) {
      await delay(300);
    }

    // Invalidate any existing program by writing meta size=0.
    await writeControl(createWriteUserProgramMetaCommand(0), 'meta(size=0)');

    // Determine chunk size.
    // Hub reports maxWriteSize for the whole GATT write.
    // WriteUserRam header is 5 bytes, so payload must fit into maxWriteSize-5.
    const maxWrite = currentHub.maxWriteSize ?? 100; // fallback conservative default
    const chunkSize = Math.max(1, Math.min(512, maxWrite - 5));

    const totalChunks = Math.ceil(programBytes.length / chunkSize);
    for (let offset = 0; offset < programBytes.length; offset += chunkSize) {
      const chunkIndex = Math.floor(offset / chunkSize) + 1;
      const chunk = programBytes.slice(offset, offset + chunkSize);
      const msg = createWriteUserRamCommand(offset, chunk);
      await writeControl(msg, `RAM chunk ${chunkIndex}/${totalChunks}`);
    }

    // Finalize download.
    await writeControl(createWriteUserProgramMetaCommand(programBytes.length), `meta(size=${programBytes.length})`);

    return true;
  } catch (error) {
    console.error('[Pybricks] Failed to upload program:', error);
    return false;
  }
}

export async function startProgram(slot = 0): Promise<boolean> {
  if (!currentHub) {
    console.error('[Pybricks] No hub connected');
    return false;
  }

  try {
    // Prefer v1.4+ format with slot id.
    try {
      await writeControl(createStartUserProgramCommand(slot), `start(slot=${slot})`);
    } catch (err) {
      // Fallback to legacy 1-byte start.
      console.warn('[Pybricks] Start with slot failed, retrying legacy start:', err);
      await writeControl(createLegacyStartUserProgramCommand(), 'start(legacy)');
    }
    return true;
  } catch (error) {
    console.error('[Pybricks] Failed to start program:', error);
    return false;
  }
}

export async function stopProgram(): Promise<boolean> {
  if (!currentHub) {
    console.error('[Pybricks] No hub connected');
    return false;
  }

  try {
    await writeControl(createStopUserProgramCommand(), 'stop');
    return true;
  } catch (error) {
    console.error('[Pybricks] Failed to stop program:', error);
    return false;
  }
}

export async function sendInput(text: string): Promise<boolean> {
  if (!currentHub) {
    console.error('[Pybricks] No hub connected');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    await writeControl(createWriteStdinCommand(textBytes), 'stdin');
    return true;
  } catch (error) {
    console.error('[Pybricks] Failed to send input:', error);
    return false;
  }
}

export function getCurrentHub(): PybricksHub | null {
  return currentHub;
}

export function isConnected(): boolean {
  return currentHub?.isConnected ?? false;
}
