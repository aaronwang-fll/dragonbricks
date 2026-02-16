// Web Bluetooth types (available in browsers that support it)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BluetoothDeviceType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BluetoothCharacteristicType = any;

// Pybricks BLE Protocol Constants
const PYBRICKS_SERVICE_UUID = 'c5f50001-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_CONTROL_CHAR_UUID = 'c5f50002-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_HUB_CHAR_UUID = 'c5f50003-8280-46da-89f4-6d8051e4aeef';

// Pybricks commands
const CMD_STOP_USER_PROGRAM = 0x00;
const CMD_START_USER_PROGRAM = 0x01;
const CMD_WRITE_USER_PROGRAM_META = 0x03;
const CMD_WRITE_USER_RAM = 0x04;
const CMD_WRITE_STDIN = 0x06;

// Status flags
const STATUS_BATTERY_LOW_VOLTAGE = 1 << 0;
const STATUS_HIGH_CURRENT = 1 << 1;
const STATUS_BLE_ADVERTISING = 1 << 2;
const STATUS_USER_PROGRAM_RUNNING = 1 << 3;
const STATUS_SHUTDOWN_REQUESTED = 1 << 4;
const STATUS_SHUTDOWN = 1 << 5;

export interface PybricksHub {
  device: BluetoothDeviceType;
  controlChar: BluetoothCharacteristicType;
  hubChar: BluetoothCharacteristicType;
  isConnected: boolean;
}

export interface HubStatus {
  batteryLow: boolean;
  highCurrent: boolean;
  advertising: boolean;
  programRunning: boolean;
  shutdownRequested: boolean;
  shutdown: boolean;
}

export type ConnectionCallback = (status: 'connected' | 'disconnected' | 'error', error?: string) => void;
export type OutputCallback = (output: string) => void;
export type StatusCallback = (status: HubStatus) => void;

let currentHub: PybricksHub | null = null;
let outputCallback: OutputCallback | null = null;
let statusCallback: StatusCallback | null = null;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in (navigator as unknown as Record<string, unknown>);
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

  outputCallback = onOutput || null;
  statusCallback = onStatus || null;

  try {
    // Request the device
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bluetooth = (navigator as any).bluetooth;
    
    // Check if Bluetooth is available and enabled
    const available = await bluetooth.getAvailability?.() ?? true;
    if (!available) {
      onConnection('error', 'Bluetooth is not available. Please enable Bluetooth on your device.');
      return null;
    }

    let device;
    try {
      device = await bluetooth.requestDevice({
        filters: [{ services: [PYBRICKS_SERVICE_UUID] }],
        optionalServices: [PYBRICKS_SERVICE_UUID],
      });
    } catch (requestError) {
      const msg = requestError instanceof Error ? requestError.message : '';
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        onConnection('error', 'Connection cancelled by user.');
      } else if (msg.includes('No device') || msg.includes('not found')) {
        onConnection('error', 'No Pybricks hub found. Make sure your hub has Pybricks firmware installed and is turned on (not running a program).');
      } else {
        onConnection('error', `Could not find hub: ${msg}`);
      }
      return null;
    }

    if (!device.gatt) {
      onConnection('error', 'GATT not available on this device.');
      return null;
    }

    // Connect to GATT server
    let server;
    try {
      console.log('[Pybricks] Connecting to GATT server...');
      console.log('[Pybricks] Device:', device.name, 'ID:', device.id);
      console.log('[Pybricks] GATT connected?', device.gatt?.connected);
      
      server = await device.gatt.connect();
      console.log('[Pybricks] GATT connected successfully');
    } catch (gattError) {
      console.error('[Pybricks] GATT connection error:', gattError);
      const msg = gattError instanceof Error ? gattError.message : String(gattError);
      
      if (msg.includes('Not supported') || msg.includes('not supported')) {
        onConnection('error', 
          'GATT connection not supported. This usually means:\n' +
          '• The hub is already connected to another app (close Pybricks Code or other BLE apps)\n' +
          '• Try: Turn hub off, wait 5 seconds, turn back on\n' +
          '• On macOS: Check System Settings → Privacy & Security → Bluetooth permissions for your browser'
        );
      } else if (msg.includes('denied') || msg.includes('permission')) {
        onConnection('error',
          'Bluetooth permission denied. On macOS: System Settings → Privacy & Security → Bluetooth → Enable for your browser'
        );
      } else {
        onConnection('error', `GATT connection failed: ${msg}`);
      }
      return null;
    }

    // Get the Pybricks service
    let service;
    try {
      console.log('[Pybricks] Getting primary service:', PYBRICKS_SERVICE_UUID);
      service = await server.getPrimaryService(PYBRICKS_SERVICE_UUID);
      console.log('[Pybricks] Service found:', service);
    } catch (serviceError) {
      console.error('[Pybricks] Service error:', serviceError);
      onConnection('error', 
        `Pybricks service not found on "${device.name}". This device may not be a Pybricks hub. Make sure to select your LEGO hub (usually named "Pybricks Hub" or similar).`
      );
      device.gatt.disconnect();
      return null;
    }

    // Get characteristics
    let controlChar, hubChar;
    try {
      console.log('[Pybricks] Getting control characteristic...');
      controlChar = await service.getCharacteristic(PYBRICKS_CONTROL_CHAR_UUID);
      console.log('[Pybricks] Getting hub characteristic...');
      hubChar = await service.getCharacteristic(PYBRICKS_HUB_CHAR_UUID);
      console.log('[Pybricks] All characteristics found');
    } catch (charError) {
      console.error('[Pybricks] Characteristic error:', charError);
      onConnection('error', 
        `Could not access Pybricks characteristics on "${device.name}". The hub firmware may be outdated.`
      );
      device.gatt.disconnect();
      return null;
    }

    // Subscribe to hub notifications
    try {
      console.log('[Pybricks] Hub characteristic properties:', hubChar.properties);
      console.log('[Pybricks] - notify:', hubChar.properties.notify);
      console.log('[Pybricks] - indicate:', hubChar.properties.indicate);
      console.log('[Pybricks] - read:', hubChar.properties.read);
      console.log('[Pybricks] - write:', hubChar.properties.write);
      
      // Only start notifications if the characteristic supports it
      if (hubChar.properties.notify || hubChar.properties.indicate) {
        console.log('[Pybricks] Starting notifications...');
        await hubChar.startNotifications();
        console.log('[Pybricks] Notifications started');
        hubChar.addEventListener('characteristicvaluechanged', handleHubNotification);
      } else {
        console.log('[Pybricks] Hub characteristic does not support notifications, skipping...');
        // Still proceed - we can poll or just not get status updates
      }
    } catch (notifyError) {
      console.error('[Pybricks] Notification error:', notifyError);
      // Don't fail the connection - notifications are nice-to-have for status updates
      // We can still upload and run programs without them
      console.log('[Pybricks] Continuing without notifications (program upload/run will still work)');
    }

    // Handle disconnection
    device.addEventListener('gattserverdisconnected', () => {
      currentHub = null;
      onConnection('disconnected');
    });

    currentHub = {
      device,
      controlChar,
      hubChar,
      isConnected: true,
    };

    console.log('[Pybricks] Connection complete!');
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
}

export async function uploadProgram(program: string): Promise<boolean> {
  if (!currentHub) {
    console.error('No hub connected');
    return false;
  }

  try {
    // Stop any running program first
    await stopProgram();

    // Convert program to bytes
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(program);

    // Write program metadata (size)
    const metaData = new Uint8Array(5);
    metaData[0] = CMD_WRITE_USER_PROGRAM_META;
    // Write size as 32-bit little-endian
    const size = programBytes.length;
    metaData[1] = size & 0xff;
    metaData[2] = (size >> 8) & 0xff;
    metaData[3] = (size >> 16) & 0xff;
    metaData[4] = (size >> 24) & 0xff;

    await currentHub.controlChar.writeValue(metaData);

    // Write program in chunks (max 100 bytes per chunk to be safe)
    const CHUNK_SIZE = 100;
    for (let offset = 0; offset < programBytes.length; offset += CHUNK_SIZE) {
      const chunk = programBytes.slice(offset, offset + CHUNK_SIZE);
      const data = new Uint8Array(5 + chunk.length);
      data[0] = CMD_WRITE_USER_RAM;
      // Write offset as 32-bit little-endian
      data[1] = offset & 0xff;
      data[2] = (offset >> 8) & 0xff;
      data[3] = (offset >> 16) & 0xff;
      data[4] = (offset >> 24) & 0xff;
      data.set(chunk, 5);

      await currentHub.controlChar.writeValue(data);

      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    return true;
  } catch (error) {
    console.error('Failed to upload program:', error);
    return false;
  }
}

export async function startProgram(): Promise<boolean> {
  if (!currentHub) {
    console.error('No hub connected');
    return false;
  }

  try {
    const data = new Uint8Array([CMD_START_USER_PROGRAM]);
    await currentHub.controlChar.writeValue(data);
    return true;
  } catch (error) {
    console.error('Failed to start program:', error);
    return false;
  }
}

export async function stopProgram(): Promise<boolean> {
  if (!currentHub) {
    console.error('No hub connected');
    return false;
  }

  try {
    const data = new Uint8Array([CMD_STOP_USER_PROGRAM]);
    await currentHub.controlChar.writeValue(data);
    return true;
  } catch (error) {
    console.error('Failed to stop program:', error);
    return false;
  }
}

export async function sendInput(text: string): Promise<boolean> {
  if (!currentHub) {
    console.error('No hub connected');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const data = new Uint8Array(1 + textBytes.length);
    data[0] = CMD_WRITE_STDIN;
    data.set(textBytes, 1);

    await currentHub.controlChar.writeValue(data);
    return true;
  } catch (error) {
    console.error('Failed to send input:', error);
    return false;
  }
}

function handleHubNotification(event: Event): void {
  const target = event.target as BluetoothCharacteristicType;
  const value = target.value;

  if (!value) return;

  // First byte is status flags
  const statusByte = value.getUint8(0);
  const status: HubStatus = {
    batteryLow: (statusByte & STATUS_BATTERY_LOW_VOLTAGE) !== 0,
    highCurrent: (statusByte & STATUS_HIGH_CURRENT) !== 0,
    advertising: (statusByte & STATUS_BLE_ADVERTISING) !== 0,
    programRunning: (statusByte & STATUS_USER_PROGRAM_RUNNING) !== 0,
    shutdownRequested: (statusByte & STATUS_SHUTDOWN_REQUESTED) !== 0,
    shutdown: (statusByte & STATUS_SHUTDOWN) !== 0,
  };

  if (statusCallback) {
    statusCallback(status);
  }

  // Remaining bytes are stdout output
  if (value.byteLength > 1) {
    const decoder = new TextDecoder();
    const output = decoder.decode(value.buffer.slice(1));
    if (outputCallback && output) {
      outputCallback(output);
    }
  }
}

export function getCurrentHub(): PybricksHub | null {
  return currentHub;
}

export function isConnected(): boolean {
  return currentHub?.isConnected ?? false;
}
