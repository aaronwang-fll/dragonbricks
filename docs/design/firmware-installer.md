# Pybricks Firmware Installer

## Overview

Add the ability to install Pybricks firmware on LEGO hubs (SPIKE Prime, SPIKE Essential, Robot Inventor, etc.) directly from DragonBricks.

## User Flow

1. **Tools Menu** → Click "Install Pybricks Firmware"
2. **Hub Selection** → Choose hub type (SPIKE Prime, Essential, City Hub, etc.)
3. **License Agreement** → Accept open-source licenses
4. **Hub Naming** → Optional custom name for the hub
5. **Update Mode Instructions** → Video/GIF showing how to put hub in bootloader mode
6. **Connect & Flash** → WebUSB connection + DFU upload with progress bar
7. **Success** → Confirmation and return to main app

## Technical Architecture

### WebUSB DFU Protocol

LEGO hubs in bootloader mode expose a USB DFU (Device Firmware Update) interface:
- Uses standard DFU protocol with LEGO-specific extensions
- Hub must be in "update mode" (bootloader) to be visible via WebUSB
- Different from normal Bluetooth connection used for program upload

### Hub Types & Firmware

| Hub | USB VID:PID (Bootloader) | Firmware Source |
|-----|--------------------------|-----------------|
| SPIKE Prime / Robot Inventor | 0x0694:0x0008 | pybricks.com |
| SPIKE Essential | 0x0694:0x0011 | pybricks.com |
| City Hub | 0x0694:0x0040 | pybricks.com |
| Technic Hub | 0x0694:0x0041 | pybricks.com |
| Move Hub | 0x0694:0x0042 | pybricks.com |

### Firmware Download

- Stable: `https://code.pybricks.com/firmware/{hub_type}/firmware.zip`
- Beta: `https://beta.pybricks.com/firmware/{hub_type}/firmware.zip`
- Nightly: `https://nightly.pybricks.com/firmware/{hub_type}/firmware.zip`

### Components

```
frontend/src/
├── lib/
│   └── firmware/
│       ├── dfu.ts           # WebUSB DFU protocol
│       ├── hubTypes.ts      # Hub definitions and firmware URLs
│       └── installer.ts     # High-level firmware installer
├── components/
│   └── firmware/
│       ├── FirmwareWizard.tsx      # Main wizard container
│       ├── HubSelector.tsx         # Step 1: Hub selection
│       ├── LicenseStep.tsx         # Step 2: License agreement
│       ├── HubNamingStep.tsx       # Step 3: Name the hub
│       ├── UpdateModeStep.tsx      # Step 4: Instructions
│       └── FlashingStep.tsx        # Step 5: Progress
└── stores/
    └── firmwareStore.ts     # Wizard state management
```

## Implementation Plan

1. Create `lib/firmware/dfu.ts` - WebUSB DFU protocol
2. Create `lib/firmware/hubTypes.ts` - Hub definitions
3. Create `lib/firmware/installer.ts` - High-level API
4. Create `stores/firmwareStore.ts` - Zustand store
5. Create wizard UI components
6. Add "Install Firmware" to Tools menu in Header
7. Add tests

## Browser Requirements

- Chrome 61+ or Edge 79+ (WebUSB support)
- macOS, Windows, Linux, ChromeOS
- NOT supported: Firefox, Safari, iOS

## References

- [Pybricks Install Guide](https://pybricks.com/learn/getting-started/install-pybricks/)
- [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/USB)
- [USB DFU Protocol](https://www.usb.org/sites/default/files/DFU_1.1.pdf)
- [Pybricks Firmware Repo](https://github.com/pybricks/pybricks-micropython)
