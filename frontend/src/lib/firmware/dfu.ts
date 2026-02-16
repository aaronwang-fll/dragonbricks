/**
 * LEGO USB DFU (DfuSe) Flasher
 *
 * SPIKE Prime / SPIKE Essential / Robot Inventor hubs expose a USB DFU interface
 * in bootloader mode, but require DfuSe semantics (start address, erase/write
 * sequencing). We use the same approach as Pybricks Code: the `dfu` npm package
 * (`WebDFU`).
 */

import { WebDFU } from 'dfu';
import type { HubType } from './hubTypes';
import { getWebUSBFiltersForHub } from './hubTypes';

export interface DfuProgress {
  phase: 'connecting' | 'erasing' | 'flashing' | 'finalizing';
  bytesSent: number;
  expectedSize: number;
  percentage: number;
  message: string;
}

export type DfuProgressCallback = (p: DfuProgress) => void;

// From Pybricks Code: currently all SPIKE hubs use the same start address.
const DFUSE_START_ADDRESS = 0x08008000;

function pct(bytesSent: number, expectedSize: number): number {
  if (!expectedSize) return 0;
  return Math.max(0, Math.min(100, Math.round((bytesSent / expectedSize) * 100)));
}

export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

/**
 * Flash firmware to a LEGO hub using USB DFU.
 *
 * @param hubType DragonBricks hub type (primehub | essentialhub)
 * @param firmware Firmware bytes (already built with correct checksum)
 */
export async function flashLegoUsbDfu(
  hubType: HubType,
  firmware: ArrayBuffer,
  onProgress?: DfuProgressCallback,
): Promise<void> {
  if (!navigator.usb) {
    throw new Error('WebUSB is not supported in this browser');
  }

  if (hubType !== 'primehub' && hubType !== 'essentialhub') {
    throw new Error(
      `USB DFU flashing is currently only supported for SPIKE Prime/Essential. Got: ${hubType}`,
    );
  }

  onProgress?.({
    phase: 'connecting',
    bytesSent: 0,
    expectedSize: firmware.byteLength,
    percentage: 0,
    message: 'Select your hub in DFU mode…',
  });

  const device = await navigator.usb.requestDevice({
    filters: getWebUSBFiltersForHub(hubType),
  });

  // Pybricks Code: SPIKE Prime bootloader must be v1.x.
  // (We keep this check to fail fast on unsupported devices.)
  if (device.productId === 0x0008 && device.deviceVersionMajor !== 1) {
    throw new Error('Unsupported SPIKE Prime DFU bootloader (expected v1.x)');
  }

  const dfu = new WebDFU(
    device,
    // forceInterfacesName is needed to get the flash layout map.
    { forceInterfacesName: true },
    {
      info: console.debug,
      warning: console.warn,
      progress: console.debug,
    },
  );

  await dfu.init();

  // We want the interface with alt=0.
  const ifaceIndex = dfu.interfaces.findIndex(
    (i: any) => i.alternate?.alternateSetting === 0,
  );
  if (ifaceIndex === -1) {
    throw new Error('No DFU interface (alt=0) found on this device');
  }

  await dfu.connect(ifaceIndex);

  try {
    (dfu as any).dfuseStartAddress = DFUSE_START_ADDRESS;

    const writeProc = dfu.write(1024, firmware, true);

    await new Promise<void>((resolve, reject) => {
      writeProc.events.on('erase/process', (bytesSent: number, expectedSize: number) => {
        onProgress?.({
          phase: 'erasing',
          bytesSent,
          expectedSize,
          percentage: pct(bytesSent, expectedSize),
          message: `Erasing flash… ${pct(bytesSent, expectedSize)}%`,
        });
      });

      writeProc.events.on('write/process', (bytesSent: number, expectedSize: number) => {
        onProgress?.({
          phase: 'flashing',
          bytesSent,
          expectedSize,
          percentage: pct(bytesSent, expectedSize),
          message: `Writing firmware… ${pct(bytesSent, expectedSize)}%`,
        });
      });

      writeProc.events.on('end', () => {
        onProgress?.({
          phase: 'finalizing',
          bytesSent: firmware.byteLength,
          expectedSize: firmware.byteLength,
          percentage: 100,
          message: 'Finalizing…',
        });
        resolve();
      });

      writeProc.events.on('error', (err: unknown) => {
        reject(err);
      });
    });
  } finally {
    // dfu.close() can throw NetworkError if the device rebooted/disconnected.
    try {
      await dfu.close();
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'NetworkError') {
        // ignore
      } else {
        console.warn('DFU close error', err);
      }
    }
  }
}
