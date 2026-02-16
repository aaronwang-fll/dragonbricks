// LEGO Hub Types and Firmware Configuration

export type HubType =
  | 'primehub'      // SPIKE Prime Hub / Robot Inventor Hub
  | 'essentialhub'  // SPIKE Essential Hub
  | 'cityhub'       // City Hub
  | 'technichub'    // Technic Hub
  | 'movehub';      // BOOST Move Hub

export interface HubDefinition {
  id: HubType;
  name: string;
  description: string;
  image: string;
  usbVendorId: number;
  usbProductId: number;
  maxFirmwareSize: number;
}

// LEGO vendor ID
const LEGO_VENDOR_ID = 0x0694;

export const HUB_DEFINITIONS: Record<HubType, HubDefinition> = {
  primehub: {
    id: 'primehub',
    name: 'SPIKE Prime / Robot Inventor',
    description: 'LEGO Education SPIKE Prime Hub or Mindstorms Robot Inventor Hub',
    image: '/images/hubs/primehub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbProductId: 0x0008,
    maxFirmwareSize: 1024 * 1024, // 1MB
  },
  essentialhub: {
    id: 'essentialhub',
    name: 'SPIKE Essential',
    description: 'LEGO Education SPIKE Essential Hub',
    image: '/images/hubs/essentialhub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbProductId: 0x0011,
    maxFirmwareSize: 512 * 1024, // 512KB
  },
  cityhub: {
    id: 'cityhub',
    name: 'City Hub',
    description: 'Powered Up City Hub',
    image: '/images/hubs/cityhub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbProductId: 0x0040,
    maxFirmwareSize: 256 * 1024, // 256KB
  },
  technichub: {
    id: 'technichub',
    name: 'Technic Hub',
    description: 'Powered Up Technic Hub',
    image: '/images/hubs/technichub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbProductId: 0x0041,
    maxFirmwareSize: 256 * 1024, // 256KB
  },
  movehub: {
    id: 'movehub',
    name: 'Move Hub',
    description: 'LEGO BOOST Move Hub',
    image: '/images/hubs/movehub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbProductId: 0x0042,
    maxFirmwareSize: 256 * 1024, // 256KB
  },
};

export const FIRMWARE_BASE_URL = 'https://firmware.pybricks.com';

export function getFirmwareUrl(hubType: HubType, channel: 'stable' | 'beta' = 'stable'): string {
  const base = channel === 'beta' ? 'https://beta.pybricks.com' : FIRMWARE_BASE_URL;
  return `${base}/v2.0/${hubType}/firmware.zip`;
}

export function getHubDefinition(hubType: HubType): HubDefinition {
  return HUB_DEFINITIONS[hubType];
}

export function getAllHubTypes(): HubDefinition[] {
  return Object.values(HUB_DEFINITIONS);
}

// WebUSB filter for requesting devices
export function getWebUSBFilters(): USBDeviceFilter[] {
  return Object.values(HUB_DEFINITIONS).map(hub => ({
    vendorId: hub.usbVendorId,
    productId: hub.usbProductId,
  }));
}

export function identifyHubFromUSB(device: USBDevice): HubDefinition | null {
  for (const hub of Object.values(HUB_DEFINITIONS)) {
    if (device.vendorId === hub.usbVendorId && device.productId === hub.usbProductId) {
      return hub;
    }
  }
  return null;
}
