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

// Pybricks firmware comes from GitHub releases
const GITHUB_API = 'https://api.github.com/repos/pybricks/pybricks-micropython/releases/latest';

interface GitHubRelease {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

/**
 * Fetch firmware metadata for a hub type from GitHub releases
 */
export async function getFirmwareInfo(hubType: HubType): Promise<FirmwareMetadata> {
  const response = await fetch(GITHUB_API);
  if (!response.ok) {
    throw new Error(`Failed to fetch firmware info: ${response.statusText}`);
  }
  const release: GitHubRelease = await response.json();
  const asset = release.assets.find(a => a.name.includes(hubType));
  
  return {
    version: release.tag_name,
    hubType,
    size: asset?.size || 0,
  };
}

/**
 * Download firmware zip file for a hub type from GitHub releases
 */
export async function downloadFirmware(
  hubType: HubType,
  onProgress?: (downloaded: number, total: number) => void
): Promise<ArrayBuffer> {
  // First get the release info to find the download URL
  const releaseResponse = await fetch(GITHUB_API);
  if (!releaseResponse.ok) {
    throw new Error(`Failed to fetch release info: ${releaseResponse.statusText}`);
  }
  const release: GitHubRelease = await releaseResponse.json();
  
  // Find the asset for this hub type
  const asset = release.assets.find(a => a.name.includes(hubType));
  if (!asset) {
    throw new Error(`No firmware found for hub type: ${hubType}`);
  }

  // Download the firmware
  const response = await fetch(asset.browser_download_url);
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

/**
 * Extract firmware binary from zip file
 */
export async function extractFirmware(zipData: ArrayBuffer, hubName?: string): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(zipData);
  
  // Find the firmware.bin file
  const firmwareFile = zip.file('firmware.bin');
  if (!firmwareFile) {
    throw new Error('firmware.bin not found in archive');
  }

  const firmware = await firmwareFile.async('arraybuffer');

  // If a custom hub name is provided, we need to patch it into the firmware
  if (hubName && hubName.trim()) {
    return patchHubName(firmware, hubName.trim());
  }

  return firmware;
}

/**
 * Patch custom hub name into firmware
 * The hub name is stored at a specific offset in the firmware
 */
function patchHubName(firmware: ArrayBuffer, name: string): ArrayBuffer {
  // Hub name is stored as null-terminated UTF-8 string
  // Location varies by hub type, but typically at a known offset
  // For now, we'll use a simplified approach that works for most hubs
  
  // Limit name to 16 characters (Bluetooth name limit)
  const limitedName = name.substring(0, 16);
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(limitedName);

  // Create a copy of the firmware
  const patchedFirmware = new Uint8Array(firmware.slice(0));
  
  // Search for the default name marker and replace
  // This is a simplified implementation - production would use proper offsets
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
      // Replace with custom name (null-padded)
      const paddedName = new Uint8Array(marker.length);
      paddedName.set(nameBytes);
      patchedFirmware.set(paddedName, i);
      break;
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
