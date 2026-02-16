/**
 * WebUSB DFU (Device Firmware Update) Protocol Implementation
 * 
 * Implements the USB DFU 1.1 protocol for flashing firmware to LEGO hubs.
 * Reference: https://www.usb.org/sites/default/files/DFU_1.1.pdf
 */

// DFU Request Types
const DFU_DNLOAD = 0x01;
const DFU_GETSTATUS = 0x03;
const DFU_CLRSTATUS = 0x04;
const DFU_ABORT = 0x06;

// DFU States
export const DFUState = {
  appIDLE: 0,
  appDETACH: 1,
  dfuIDLE: 2,
  dfuDNLOAD_SYNC: 3,
  dfuDNBUSY: 4,
  dfuDNLOAD_IDLE: 5,
  dfuMANIFEST_SYNC: 6,
  dfuMANIFEST: 7,
  dfuMANIFEST_WAIT_RESET: 8,
  dfuUPLOAD_IDLE: 9,
  dfuERROR: 10,
} as const;

export type DFUState = typeof DFUState[keyof typeof DFUState];

// DFU Status Codes
export const DFUStatus = {
  OK: 0x00,
  errTARGET: 0x01,
  errFILE: 0x02,
  errWRITE: 0x03,
  errERASE: 0x04,
  errCHECK_ERASED: 0x05,
  errPROG: 0x06,
  errVERIFY: 0x07,
  errADDRESS: 0x08,
  errNOTDONE: 0x09,
  errFIRMWARE: 0x0a,
  errVENDOR: 0x0b,
  errUSBR: 0x0c,
  errPOR: 0x0d,
  errUNKNOWN: 0x0e,
  errSTALLEDPKT: 0x0f,
} as const;

export type DFUStatus = typeof DFUStatus[keyof typeof DFUStatus];

// Helper to get status name from code
function getStatusName(status: DFUStatus): string {
  for (const [key, value] of Object.entries(DFUStatus)) {
    if (value === status) return key;
  }
  return `unknown(${status})`;
}

// Helper to get state name from code
function getStateName(state: DFUState): string {
  for (const [key, value] of Object.entries(DFUState)) {
    if (value === state) return key;
  }
  return `unknown(${state})`;
}

export interface DFUStatusResponse {
  status: DFUStatus;
  pollTimeout: number;
  state: DFUState;
}

export interface DFUProgress {
  bytesWritten: number;
  totalBytes: number;
  percentage: number;
  state: 'preparing' | 'erasing' | 'flashing' | 'verifying' | 'complete' | 'error';
  message: string;
}

export type ProgressCallback = (progress: DFUProgress) => void;

export class DFUDevice {
  private device: USBDevice;
  private interfaceNumber: number;
  private transferSize: number;

  constructor(device: USBDevice, interfaceNumber: number = 0, transferSize: number = 2048) {
    this.device = device;
    this.interfaceNumber = interfaceNumber;
    this.transferSize = transferSize;
  }

  static async requestDevice(filters: USBDeviceFilter[]): Promise<DFUDevice | null> {
    try {
      const device = await navigator.usb.requestDevice({ filters });
      return new DFUDevice(device);
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        // User cancelled the picker
        return null;
      }
      throw error;
    }
  }

  async open(): Promise<void> {
    await this.device.open();
    
    // Find the DFU interface
    const configuration = this.device.configuration;
    if (!configuration) {
      await this.device.selectConfiguration(1);
    }

    // Claim the DFU interface
    await this.device.claimInterface(this.interfaceNumber);
  }

  async close(): Promise<void> {
    try {
      await this.device.releaseInterface(this.interfaceNumber);
      await this.device.close();
    } catch {
      // Ignore errors during close
    }
  }

  async getStatus(): Promise<DFUStatusResponse> {
    const result = await this.device.controlTransferIn({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_GETSTATUS,
      value: 0,
      index: this.interfaceNumber,
    }, 6);

    if (!result.data || result.data.byteLength < 6) {
      throw new Error('Invalid DFU status response');
    }

    const data = new DataView(result.data.buffer);
    return {
      status: data.getUint8(0) as DFUStatus,
      pollTimeout: data.getUint8(1) | (data.getUint8(2) << 8) | (data.getUint8(3) << 16),
      state: data.getUint8(4) as DFUState,
    };
  }

  async clearStatus(): Promise<void> {
    await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_CLRSTATUS,
      value: 0,
      index: this.interfaceNumber,
    });
  }

  async abort(): Promise<void> {
    await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_ABORT,
      value: 0,
      index: this.interfaceNumber,
    });
  }

  private async download(blockNum: number, data: ArrayBuffer): Promise<void> {
    await this.device.controlTransferOut({
      requestType: 'class',
      recipient: 'interface',
      request: DFU_DNLOAD,
      value: blockNum,
      index: this.interfaceNumber,
    }, data);
  }

  private async waitForState(expectedState: DFUState, maxAttempts: number = 100): Promise<DFUStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getStatus();
      
      if (status.state === expectedState) {
        return status;
      }

      if (status.state === DFUState.dfuERROR) {
        throw new Error(`DFU error: status=${getStatusName(status.status)}`);
      }

      // Wait for the poll timeout
      await new Promise(resolve => setTimeout(resolve, status.pollTimeout || 100));
    }

    throw new Error(`Timeout waiting for DFU state ${getStateName(expectedState)}`);
  }

  async flash(firmware: ArrayBuffer, onProgress?: ProgressCallback): Promise<void> {
    const totalBytes = firmware.byteLength;
    let bytesWritten = 0;
    let blockNum = 0;

    const reportProgress = (state: DFUProgress['state'], message: string) => {
      onProgress?.({
        bytesWritten,
        totalBytes,
        percentage: Math.round((bytesWritten / totalBytes) * 100),
        state,
        message,
      });
    };

    try {
      // Clear any error state
      let status = await this.getStatus();
      if (status.state === DFUState.dfuERROR) {
        await this.clearStatus();
      }

      // Ensure we're in dfuIDLE state
      status = await this.getStatus();
      if (status.state !== DFUState.dfuIDLE && status.state !== DFUState.dfuDNLOAD_IDLE) {
        await this.abort();
        await this.waitForState(DFUState.dfuIDLE);
      }

      reportProgress('flashing', 'Starting firmware upload...');

      // Download firmware in chunks
      const firmwareView = new Uint8Array(firmware);
      
      while (bytesWritten < totalBytes) {
        const chunkSize = Math.min(this.transferSize, totalBytes - bytesWritten);
        const chunk = firmwareView.slice(bytesWritten, bytesWritten + chunkSize);
        
        await this.download(blockNum, chunk.buffer);
        await this.waitForState(DFUState.dfuDNLOAD_IDLE);

        bytesWritten += chunkSize;
        blockNum++;

        reportProgress('flashing', `Uploading firmware: ${Math.round((bytesWritten / totalBytes) * 100)}%`);
      }

      // Send zero-length packet to signal end of transfer
      reportProgress('verifying', 'Finalizing firmware...');
      await this.download(blockNum, new ArrayBuffer(0));

      // Wait for manifestation
      await this.waitForState(DFUState.dfuMANIFEST_WAIT_RESET, 200);

      reportProgress('complete', 'Firmware installation complete!');
    } catch (error) {
      reportProgress('error', `Error: ${(error as Error).message}`);
      throw error;
    }
  }

  get productName(): string {
    return this.device.productName || 'Unknown Device';
  }

  get serialNumber(): string {
    return this.device.serialNumber || '';
  }
}

export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}
