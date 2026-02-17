/**
 * High-level Pybricks Firmware Installer
 *
 * Downloads a Pybricks firmware zip via our backend proxy, builds a flashable
 * binary (hub name patch + checksum) and flashes it to the hub using LEGO's
 * USB DFU (DfuSe) bootloader.
 */

import { flashLegoUsbDfu, isWebUSBSupported } from './dfu';
import type { DfuProgress } from './dfu';
import type { HubType, HubDefinition } from './hubTypes';
import { getHubDefinition } from './hubTypes';
import { FirmwareReader, encodeHubName, metadataIsV200, metadataIsV210 } from '@pybricks/firmware';
import type { HubType as PybricksHubType } from '@pybricks/firmware';

export interface FirmwareMetadata {
  version: string;
  hubType: HubType;
  size: number;
  checksum?: string;
}

export interface InstallProgress extends DfuProgress {
  step: 'downloading' | 'extracting' | 'connecting' | 'flashing' | 'complete' | 'error';
}

export type InstallProgressCallback = (progress: InstallProgress) => void;

// Firmware downloads are proxied through our backend to avoid CORS issues
const FIRMWARE_API = '/api/v1/firmware';

interface FirmwareInfoResponse {
  version: string;
  assets: Array<{
    hub_type: string;
    name: string;
    size: number;
    download_url: string;
  }>;
}

/** Fetch firmware metadata for a hub type from our backend */
export async function getFirmwareInfo(hubType: HubType): Promise<FirmwareMetadata> {
  const response = await fetch(`${FIRMWARE_API}/info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch firmware info: ${response.statusText}`);
  }
  const data: FirmwareInfoResponse = await response.json();
  const asset = data.assets.find((a) => a.hub_type === hubType);

  return {
    version: data.version,
    hubType,
    size: asset?.size || 0,
  };
}

/** Download firmware zip file for a hub type via our backend proxy */
export async function downloadFirmware(
  hubType: HubType,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(`${FIRMWARE_API}/download/${hubType}`);
  if (!response.ok) {
    throw new Error(`Failed to download firmware: ${response.statusText}`);
  }

  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    return await response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    downloaded += value.length;
    onProgress?.(downloaded, total);
  }

  const firmware = new Uint8Array(downloaded);
  let offset = 0;
  for (const chunk of chunks) {
    firmware.set(chunk, offset);
    offset += chunk.length;
  }

  return firmware.buffer;
}

function* firmwareIterator(view: DataView, maxSize: number): Generator<number> {
  for (let i = 0; i < view.byteLength; i += 4) {
    yield view.getUint32(i, true);
  }
  for (let i = view.byteLength; i < maxSize; i += 4) {
    yield ~0;
  }
}

function sumComplement32(data: Iterable<number>): number {
  let total = 0;
  for (const n of data) {
    total += n;
    total &= ~0;
  }
  return ~total + 1;
}

// Same CRC32 implementation as Pybricks Code (nibble-wise)
const crc32Table: ReadonlyArray<number> = [
  0x00000000, 0x04c11db7, 0x09823b6e, 0x0d4326d9, 0x130476dc, 0x17c56b6b, 0x1a864db2, 0x1e475005,
  0x2608edb8, 0x22c9f00f, 0x2f8ad6d6, 0x2b4bcb61, 0x350c9b64, 0x31cd86d3, 0x3c8ea00a, 0x384fbdbd,
];

function crc32(data: Iterable<number>): number {
  let crc = 0xffffffff;
  for (const word of data) {
    crc ^= word;
    for (let i = 0; i < 8; i++) {
      crc = (crc << 4) ^ crc32Table[crc >>> 28];
    }
  }
  return crc >>> 0;
}

/**
 * Build a flashable firmware image from a Pybricks firmware zip.
 *
 * For SPIKE hubs, Pybricks uses metadata v2.x.
 */
export async function buildPybricksFirmwareFromZip(
  zipData: ArrayBuffer,
  hubName?: string,
): Promise<{ firmware: Uint8Array; deviceId: PybricksHubType }> {
  const reader = await FirmwareReader.load(zipData);
  const firmwareBase = await reader.readFirmwareBase();
  const metadata = await reader.readMetadata();

  if (!(metadataIsV200(metadata) || metadataIsV210(metadata))) {
    throw new Error('Unsupported Pybricks firmware metadata version. (Expected v2.x.)');
  }

  const [checksumFunc, checksumExtraLength] = (() => {
    switch (metadata['checksum-type']) {
      case 'sum':
        return [sumComplement32, 4] as const;
      case 'crc32':
        return [crc32, 4] as const;
      case 'none':
        return [null, 0] as const;
      default:
        return [undefined, 0] as const;
    }
  })();

  if (checksumFunc === undefined) {
    throw new Error(`Unsupported checksum-type: ${String(metadata['checksum-type'])}`);
  }

  const firmware = new Uint8Array(firmwareBase.length + checksumExtraLength);
  const firmwareView = new DataView(firmware.buffer);
  firmware.set(firmwareBase);

  // Empty string means keep the default name in the firmware.
  if (hubName && hubName.trim()) {
    const encoded = encodeHubName(hubName.trim(), metadata);
    firmware.set(encoded, metadata['hub-name-offset']);
  }

  if (checksumFunc !== null) {
    firmwareView.setUint32(
      firmwareBase.length,
      checksumFunc(firmwareIterator(firmwareView, metadata['checksum-size'])),
      true,
    );
  }

  return { firmware, deviceId: metadata['device-id'] };
}

/** Request and connect to a hub in bootloader mode (USB DFU only). */
export async function connectToHub(hubType: HubType): Promise<HubDefinition> {
  if (!isWebUSBSupported()) {
    throw new Error('WebUSB is not supported in this browser');
  }

  // We don't actually connect/claim here; `flashLegoUsbDfu` will do that.
  return getHubDefinition(hubType);
}

/** Full firmware installation process */
export async function installFirmware(
  hubType: HubType,
  hubName: string | undefined,
  onProgress: InstallProgressCallback,
): Promise<void> {
  const report = (p: Partial<InstallProgress> & Pick<InstallProgress, 'step' | 'message'>) => {
    onProgress({
      step: p.step,
      phase: p.phase ?? (p.step === 'flashing' ? 'flashing' : 'connecting'),
      bytesSent: p.bytesSent ?? 0,
      expectedSize: p.expectedSize ?? 0,
      percentage: p.percentage ?? 0,
      message: p.message,
    });
  };

  try {
    // Step 1: Download firmware
    report({ step: 'downloading', message: 'Downloading firmware…', phase: 'connecting' });

    const zipData = await downloadFirmware(hubType, (downloaded, total) => {
      report({
        step: 'downloading',
        phase: 'connecting',
        bytesSent: downloaded,
        expectedSize: total,
        percentage: total ? Math.round((downloaded / total) * 100) : 0,
        message: total
          ? `Downloading firmware… ${Math.round((downloaded / total) * 100)}%`
          : 'Downloading firmware…',
      });
    });

    // Step 2: Build flashable firmware
    report({ step: 'extracting', message: 'Preparing firmware…', phase: 'connecting' });
    const { firmware } = await buildPybricksFirmwareFromZip(zipData, hubName);

    // Step 3: Prompt user to select hub
    report({
      step: 'connecting',
      phase: 'connecting',
      bytesSent: 0,
      expectedSize: firmware.byteLength,
      percentage: 0,
      message: 'Connect your hub in update mode and select it in the browser prompt…',
    });

    // Step 4: Flash
    const firmwareArrayBuffer = firmware.buffer.slice(
      firmware.byteOffset,
      firmware.byteOffset + firmware.byteLength,
    ) as ArrayBuffer;

    await flashLegoUsbDfu(hubType, firmwareArrayBuffer, (dfuProgress) => {
      report({ step: 'flashing', ...dfuProgress, message: dfuProgress.message });
    });

    report({
      step: 'complete',
      phase: 'finalizing',
      bytesSent: firmware.byteLength,
      expectedSize: firmware.byteLength,
      percentage: 100,
      message: 'Firmware installation complete! Your hub will restart automatically.',
    });
  } catch (error) {
    report({
      step: 'error',
      phase: 'finalizing',
      message: `Installation failed: ${(error as Error).message}`,
    });
    throw error;
  }
}

/** Restore original LEGO firmware (not implemented natively yet). */
export function getRestoreFirmwareUrl(): string {
  return 'https://code.pybricks.com/';
}
