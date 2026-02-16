# LEGO Hub Bootloader (USB DFU / DfuSe) – Design Notes

## Why our old DFU code failed
LEGO SPIKE Prime / SPIKE Essential / MINDSTORMS Robot Inventor hubs expose a **USB DFU class** interface in “firmware update mode”, but they use **STMicroelectronics DfuSe**-style behavior (flash layout, erase/write sequencing, start address, etc.).

Our previous implementation (`frontend/src/lib/firmware/dfu.ts`) only implemented the basic DFU 1.1 requests (`DNLOAD`, `GETSTATUS`, …) and assumed a simple “download blocks until manifest” flow.

In practice, these hubs require:
- selecting the correct DFU interface/alternate setting
- using DfuSe semantics (including setting a **start address**)
- handling erase + write progress correctly

Pybricks Code solves this by using the `dfu` JavaScript library (`WebDFU`), which implements the required DfuSe logic.

## Reference implementation (Pybricks Code)
In `pybricks-code/src/firmware/sagas.ts`:
- WebUSB device filtering uses LEGO VID `0x0694` and bootloader PIDs.
- Flashing uses `WebDFU` from the `dfu` npm package.
- It forces interface name parsing (`forceInterfacesName`) so flash layout parsing works.
- It uses a constant DfuSe start address: `0x08008000`.
- It writes in 1024-byte chunks and subscribes to `erase/process` and `write/process` events.

## USB IDs (VID/PID)
LEGO USB vendor id:
- `0x0694`

Product IDs (bootloader/DFU mode) (from Pybricks Code `src/usb/index.ts`):
- SPIKE Prime Bootloader: `0x0008`
- SPIKE Essential Bootloader: `0x000c`
- MINDSTORMS Robot Inventor Bootloader: `0x0011`

Notes:
- Pybricks treats **Prime Hub flashing** as supporting both `0x0008` and `0x0011` (same firmware format).
- Pybricks rejects SPIKE Prime bootloader devices where `deviceVersionMajor !== 1`.

## Flashing protocol (high-level)
1. `navigator.usb.requestDevice()` with the correct VID/PID filters.
2. Create `new WebDFU(device, { forceInterfacesName: true }, logger)`.
3. `await dfu.init()` to enumerate DFU interfaces and memory layout.
4. Select the DFU interface whose alternate setting is `0`.
5. `await dfu.connect(ifaceIndex)`.
6. Set `dfu.dfuseStartAddress = 0x08008000`.
7. Start write: `dfu.write(1024, firmware, true)`.
   - `erase/process` event: progress during erase
   - `write/process` event: progress during write
   - `end` event: success
   - `error` event: failure
8. Close DFU device.

## Firmware packaging (Pybricks firmware.zip)
Pybricks firmware is distributed as a zip. Correct hub-name patching and checksum handling is non-trivial.

Instead of manually extracting `firmware-base.bin`, we use `@pybricks/firmware`:
- `FirmwareReader.load(zip)`
- `readFirmwareBase()`
- `readMetadata()`
- `encodeHubName(name, metadata)`

For metadata v2.x (the current format for SPIKE hubs):
- Patch hub name (optional)
- Recompute checksum if metadata says checksum-type is `sum` or `crc32`.

## DragonBricks implementation plan
### Code changes
- Replace the old handcrafted DFU implementation with a `WebDFU`-based flasher.
- Add dependencies:
  - `dfu`
  - `@pybricks/firmware`
- Update hub USB PID definitions (Essential bootloader PID was wrong).
- Update the firmware installer to:
  - download the Pybricks firmware zip
  - build a flashable binary using `@pybricks/firmware`
  - flash over USB DFU using `WebDFU`
- Update `FlashingStep.tsx` to flash natively and show progress.

### Out of scope (future)
- BLE LWP3 bootloader flashing for City/Move/Technic hubs.
- EV3 flashing via WebHID.

## Testing notes
- Test target: SPIKE Prime hub in DFU mode.
- Expected behavior:
  - device picker shows “SPIKE Prime Hub” in firmware update mode
  - progress updates during erase and write
  - hub reboots into Pybricks after completion
