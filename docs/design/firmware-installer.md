# Pybricks Firmware Installer

## Overview

Install Pybricks firmware on LEGO hubs (SPIKE Prime, SPIKE Essential, Robot Inventor) directly from DragonBricks using WebUSB and the DfuSe protocol.

**Status:** ✅ Implemented and tested (2026-02-16)

## User Flow

1. **Tools Menu** → Click "Install Pybricks Firmware"
2. **Hub Selection** → Choose hub type (SPIKE Prime, Essential, etc.)
3. **License Agreement** → Accept Pybricks open-source licenses
4. **Hub Naming** → Optional custom Bluetooth name for the hub
5. **Update Mode Instructions** → How to put hub in bootloader mode
6. **Connect & Flash** → WebUSB device picker + DFU flashing with progress
7. **Success** → Hub reboots into Pybricks

## Technical Architecture

### USB DFU / DfuSe Protocol

LEGO SPIKE hubs use STMicroelectronics DfuSe-style USB firmware updates:
- Standard DFU 1.1 protocol with DfuSe extensions
- Hub must be in "update mode" (bootloader) to be visible via WebUSB
- Uses `WebDFU` library from the `dfu` npm package
- Start address: `0x08008000`

See [lego-bootloader.md](./lego-bootloader.md) for protocol details.

### Hub Types & USB IDs

| Hub | USB VID | Bootloader PID | Status |
|-----|---------|----------------|--------|
| SPIKE Prime | 0x0694 | 0x0008, 0x0011 | ✅ Supported |
| SPIKE Essential | 0x0694 | 0x000c | ✅ Supported |
| Robot Inventor | 0x0694 | 0x0011 | ✅ Supported |
| City Hub | 0x0694 | — | ❌ BLE only (future) |
| Technic Hub | 0x0694 | — | ❌ BLE only (future) |
| Move Hub | 0x0694 | — | ❌ BLE only (future) |

### Firmware Source

Firmware is fetched from **GitHub Releases** (not firmware.pybricks.com):
- API: `https://api.github.com/repos/pybricks/pybricks-micropython/releases/latest`
- Assets: `pybricks-{hubtype}-v{version}.zip`

**CORS Note:** Browser cannot fetch firmware directly from GitHub's release assets CDN (`release-assets.githubusercontent.com`) due to CORS. We use a backend proxy.

### Backend Proxy Endpoints

```
GET /api/v1/firmware/info
  → Returns latest release version + asset list

GET /api/v1/firmware/download/{hub_type}
  → Streams firmware ZIP (bypasses CORS)
```

### Firmware ZIP Processing

Uses `@pybricks/firmware` package:
1. `FirmwareReader.load(zipData)` — parse ZIP
2. `readFirmwareBase()` — extract `firmware-base.bin`
3. `readMetadata()` — read `firmware.metadata.json` (v2.x format)
4. `encodeHubName(name, metadata)` — patch custom hub name
5. Compute checksum (crc32 or sum) per metadata spec
6. Flash via WebDFU

### Components

```
frontend/src/
├── lib/firmware/
│   ├── dfu.ts           # WebDFU wrapper (DfuSe flashing)
│   ├── hubTypes.ts      # Hub definitions, USB IDs, WebUSB filters
│   ├── installer.ts     # Download, build, flash orchestration
│   └── index.ts         # Public exports
├── components/firmware/
│   ├── FirmwareWizard.tsx      # Wizard container
│   ├── HubSelector.tsx         # Step 1: Hub selection
│   ├── LicenseStep.tsx         # Step 2: License agreement
│   ├── HubNamingStep.tsx       # Step 3: Name the hub
│   ├── UpdateModeStep.tsx      # Step 4: Bootloader instructions
│   ├── FlashingStep.tsx        # Step 5: Progress + flash
│   └── index.ts
└── stores/
    └── firmwareStore.ts        # Zustand wizard state

backend/app/api/
└── firmware.py                 # Proxy endpoints
```

## Dependencies

Frontend:
- `dfu` — WebDFU (DfuSe) implementation
- `@pybricks/firmware` — Firmware ZIP parsing, metadata, hub name encoding

Backend:
- `httpx` — Async HTTP client for GitHub API

## Browser Requirements

- Chrome 61+ or Edge 79+ (WebUSB support)
- macOS, Windows, Linux, ChromeOS
- **NOT supported:** Firefox, Safari, iOS (no WebUSB)

## Future Work

- [ ] BLE LWP3 bootloader for City/Technic/Move hubs
- [ ] Firmware version selection (beta, nightly)
- [ ] Restore original LEGO firmware option

## References

- [Pybricks Install Guide](https://pybricks.com/learn/getting-started/install-pybricks/)
- [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/USB)
- [DFU 1.1 Specification](https://www.usb.org/sites/default/files/DFU_1.1.pdf)
- [Pybricks Firmware Repo](https://github.com/pybricks/pybricks-micropython)
- [Pybricks Code (reference implementation)](https://github.com/pybricks/pybricks-code)
