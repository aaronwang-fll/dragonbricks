/**
 * High-level Pybricks Firmware Installer
 * 
 * Coordinates firmware download, extraction, and installation.
 */

import { DFUDevice, isWebUSBSupported } from './dfu';
import type { DFUProgress } from './dfu';
import { getHubDefinition, getWebUSBFilters } from './hubTypes';
import type { HubType, HubDefinition } from './hubTypes';
import JSZip from 'jszip';

export interface FirmwareMetadata {
  version: string;
  hubType: HubType;
  size: number;
  checksum?: string;
}

export interface InstallProgress extends DFUProgress {
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

/**
 * Fetch firmware metadata for a hub type from our backend
 */
export async function getFirmwareInfo(hubType: HubType): Promise<FirmwareMetadata> {
  const response = await fetch(`${FIRMWARE_API}/info`);
  if (!response.ok) {
    throw new Error(`Failed to fetch firmware info: ${response.statusText}`);
  }
  const data: FirmwareInfoResponse = await response.json();
  const asset = data.assets.find(a => a.hub_type === hubType);
  
  return {
    version: data.version,
    hubType,
    size: asset?.size || 0,
  };
}

/**
 * Download firmware zip file for a hub type via our backend proxy
 */
export async function downloadFirmware(
  hubType: HubType,
  onProgress?: (downloaded: number, total: number) => void
): Promise<ArrayBuffer> {
  // Download via our backend proxy (avoids CORS issues with GitHub)
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

  // Combine chunks
  const firmware = new Uint8Array(downloaded);
  let offset = 0;
  for (const chunk of chunks) {
    firmware.set(chunk, offset);
    offset += chunk.length;
  }

  return firmware.buffer;
}

interface FirmwareMetadataJson {
  'hub-name-offset': number;
  'hub-name-size': number;
  'firmware-version': string;
}

/**
 * Extract firmware binary from zip file
 */
export async function extractFirmware(zipData: ArrayBuffer, hubName?: string): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(zipData);
  
  // Find the firmware-base.bin file (Pybricks naming convention)
  const firmwareFile = zip.file('firmware-base.bin');
  if (!firmwareFile) {
    throw new Error('firmware-base.bin not found in archive');
  }

  const firmware = await firmwareFile.async('arraybuffer');

  // If a custom hub name is provided, we need to patch it into the firmware
  if (hubName && hubName.trim()) {
    // Try to get metadata for proper patching
    const metadataFile = zip.file('firmware.metadata.json');
    let metadata: FirmwareMetadataJson | null = null;
    
    if (metadataFile) {
      try {
        const metadataStr = await metadataFile.async('string');
        metadata = JSON.parse(metadataStr);
      } catch {
        // Ignore metadata parsing errors, fall back to search-based patching
      }
    }
    
    return patchHubName(firmware, hubName.trim(), metadata);
  }

  return firmware;
}

/**
 * Patch custom hub name into firmware
 * Uses metadata offset if available, otherwise searches for default name
 */
function patchHubName(
  firmware: ArrayBuffer, 
  name: string, 
  metadata: FirmwareMetadataJson | null
): ArrayBuffer {
  const encoder = new TextEncoder();
  const patchedFirmware = new Uint8Array(firmware.slice(0));
  
  // Limit name to hub-name-size (default 16 characters)
  const maxLength = metadata?.['hub-name-size'] || 16;
  const limitedName = name.substring(0, maxLength);
  const nameBytes = encoder.encode(limitedName);

  if (metadata && metadata['hub-name-offset']) {
    // Use metadata offset for precise patching
    const offset = metadata['hub-name-offset'];
    const paddedName = new Uint8Array(maxLength);
    paddedName.set(nameBytes);
    patchedFirmware.set(paddedName, offset);
  } else {
    // Fallback: Search for default name marker and replace
    const marker = encoder.encode('Pybricks Hub');
    
    for (let i = 0; i < patchedFirmware.length - marker.length; i++) {
      let found = true;
      for (let j = 0; j < marker.length; j++) {
        if (patchedFirmware[i + j] !== marker[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        const paddedName = new Uint8Array(marker.length);
        paddedName.set(nameBytes);
        patchedFirmware.set(paddedName, i);
        break;
      }
    }
  }

  return patchedFirmware.buffer;
}

/**
 * Request and connect to a hub in bootloader mode
 */
export async function connectToHub(): Promise<{ device: DFUDevice; hub: HubDefinition } | null> {
  if (!isWebUSBSupported()) {
    throw new Error('WebUSB is not supported in this browser');
  }

  const filters = getWebUSBFilters();
  const device = await DFUDevice.requestDevice(filters);
  
  if (!device) {
    return null; // User cancelled
  }

  await device.open();

  // Try to identify the hub type from the USB device
  // This requires access to the raw USBDevice which we need to expose
  // For now, we'll return a generic response and let the caller specify the hub type
  
  return {
    device,
    hub: getHubDefinition('primehub'), // Default, should be overridden by user selection
  };
}

/**
 * Full firmware installation process
 */
export async function installFirmware(
  hubType: HubType,
  hubName: string | undefined,
  onProgress: InstallProgressCallback
): Promise<void> {
  const reportProgress = (
    step: InstallProgress['step'],
    state: DFUProgress['state'],
    message: string,
    percentage: number = 0
  ) => {
    onProgress({
      step,
      state,
      message,
      bytesWritten: 0,
      totalBytes: 0,
      percentage,
    });
  };

  try {
    // Step 1: Download firmware
    reportProgress('downloading', 'preparing', 'Downloading firmware...');

    const zipData = await downloadFirmware(hubType, (downloaded, total) => {
      const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
      reportProgress('downloading', 'flashing', `Downloading firmware: ${pct}%`, pct);
    });

    // Step 2: Extract firmware
    reportProgress('extracting', 'preparing', 'Extracting firmware...');
    const firmware = await extractFirmware(zipData, hubName);
    reportProgress('extracting', 'complete', 'Firmware extracted', 100);

    // Step 3: Connect to hub
    reportProgress('connecting', 'preparing', 'Waiting for hub connection...');
    
    const connection = await connectToHub();
    if (!connection) {
      throw new Error('No hub connected');
    }

    reportProgress('connecting', 'complete', `Connected to ${connection.device.productName}`, 100);

    // Step 4: Flash firmware
    await connection.device.flash(firmware, (dfuProgress) => {
      onProgress({
        ...dfuProgress,
        step: 'flashing',
      });
    });

    await connection.device.close();

    reportProgress('complete', 'complete', 'Firmware installation complete! Your hub will restart automatically.', 100);
  } catch (error) {
    reportProgress('error', 'error', `Installation failed: ${(error as Error).message}`, 0);
    throw error;
  }
}

/**
 * Restore original LEGO firmware
 * This redirects to the official LEGO firmware update tool
 */
export function getRestoreFirmwareUrl(_hubType?: HubType): string {
  // LEGO's official firmware restore is done through their apps
  // We can provide instructions or link to code.pybricks.com's restore feature
  return 'https://code.pybricks.com/';
}
