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
  /**
   * USB product IDs that may appear for this hub when it is in bootloader/DFU mode.
   * (Some hubs have multiple bootloader PIDs, e.g. Prime vs Robot Inventor.)
   */
  usbBootloaderProductIds: number[];
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
    // SPIKE Prime Bootloader (0x0008) and Robot Inventor Bootloader (0x0011)
    usbBootloaderProductIds: [0x0008, 0x0011],
    maxFirmwareSize: 1024 * 1024, // 1MB
  },
  essentialhub: {
    id: 'essentialhub',
    name: 'SPIKE Essential',
    description: 'LEGO Education SPIKE Essential Hub',
    image: '/images/hubs/essentialhub.png',
    usbVendorId: LEGO_VENDOR_ID,
    // SPIKE Essential Bootloader (0x000c)
    usbBootloaderProductIds: [0x000c],
    maxFirmwareSize: 512 * 1024, // 512KB
  },
  // Note: City/Technic/Move hubs use a different (BLE) bootloader protocol for Pybricks.
  cityhub: {
    id: 'cityhub',
    name: 'City Hub',
    description: 'Powered Up City Hub',
    image: '/images/hubs/cityhub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbBootloaderProductIds: [],
    maxFirmwareSize: 256 * 1024, // 256KB
  },
  technichub: {
    id: 'technichub',
    name: 'Technic Hub',
    description: 'Powered Up Technic Hub',
    image: '/images/hubs/technichub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbBootloaderProductIds: [],
    maxFirmwareSize: 256 * 1024, // 256KB
  },
  movehub: {
    id: 'movehub',
    name: 'Move Hub',
    description: 'LEGO BOOST Move Hub',
    image: '/images/hubs/movehub.png',
    usbVendorId: LEGO_VENDOR_ID,
    usbBootloaderProductIds: [],
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
  const filters: USBDeviceFilter[] = [];

  for (const hub of Object.values(HUB_DEFINITIONS)) {
    for (const productId of hub.usbBootloaderProductIds) {
      filters.push({ vendorId: hub.usbVendorId, productId });
    }
  }

  return filters;
}

export function getWebUSBFiltersForHub(hubType: HubType): USBDeviceFilter[] {
  const hub = HUB_DEFINITIONS[hubType];
  return hub.usbBootloaderProductIds.map((productId) => ({
    vendorId: hub.usbVendorId,
    productId,
  }));
}

export function identifyHubFromUSB(device: USBDevice): HubDefinition | null {
  for (const hub of Object.values(HUB_DEFINITIONS)) {
    if (device.vendorId !== hub.usbVendorId) continue;
    if (hub.usbBootloaderProductIds.includes(device.productId)) return hub;
  }
  return null;
}
