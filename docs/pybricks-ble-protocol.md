# Pybricks BLE protocol notes (DragonBricks)

This document summarizes the parts of the Pybricks BLE "Pybricks Service" protocol that DragonBricks uses.

Primary reference implementation: Pybricks Code
- https://github.com/pybricks/pybricks-code
  - `src/ble/sagas.ts` (BLE connection management)
  - `src/ble-pybricks-service/protocol.ts` (wire protocol)
  - `src/hub/sagas.ts` (download & run flow)

## GATT service + characteristics

**Service**
- UUID: `c5f50001-8280-46da-89f4-6d8051e4aeef`

**Control/Event characteristic** (commands are written here; events are notified here)
- UUID: `c5f50002-8280-46da-89f4-6d8051e4aeef`
- Use `startNotifications()` to receive protocol events
- Pybricks Code calls `stopNotifications()` then `startNotifications()` to avoid a Chromium/Linux reconnection edge case.

**Hub Capabilities characteristic** (read-only)
- UUID: `c5f50003-8280-46da-89f4-6d8051e4aeef`
- Layout (Profile v1.2.0+):
  - bytes `0..1`: `maxWriteSize` (uint16 LE)
  - bytes `2..5`: `flags` (uint32 LE)
  - bytes `6..9`: `maxUserProgramSize` (uint32 LE)
  - byte `10`: `numSlots` (uint8) (Profile v1.5.0+)

## Control/Event notifications (events)

First byte is an `EventType`:
- `0` StatusReport
- `1` WriteStdout
- `2` WriteAppData

### StatusReport
Message layout:
- `[0]` = 0 (StatusReport)
- `[1..4]` = flags (uint32 LE)
- `[5]` = running program id (uint8, Profile v1.4+)
- `[6]` = selected slot (uint8, Profile v1.5+)

The flags are bit positions (Status enum in Pybricks Code):
- bit 6 (`UserProgramRunning`) indicates whether the runtime is busy running a program.

### WriteStdout
- `[0]` = 1 (WriteStdout)
- `[1..]` = raw stdout bytes (decode as UTF-8)

## Download / upload flow (critical)

DragonBricks must follow the same flow as Pybricks Code (`src/hub/sagas.ts`):

1. Stop any running program.
2. **Invalidate existing user program** by writing `WriteUserProgramMeta(size=0)`.
3. Write the program bytes into user RAM in chunks using `WriteUserRam(offset, payload)`.
   - `WriteUserRam` has a 5-byte header (command + uint32 offset).
   - Payload chunk size should respect `maxWriteSize`:
     - `chunkSize = maxWriteSize - 5`
4. Finalize by writing `WriteUserProgramMeta(size=finalSize)`.

Skipping step (2) was the most likely cause of the observed failure where a 1-byte stop worked, but the 5-byte metadata write failed with a generic GATT error.

## Start command

- Profile v1.4+ expects `StartUserProgram` with a slot id:
  - `[0]=1, [1]=slot`
- Older firmware used a legacy 1-byte start.

DragonBricks tries the 2-byte form first and falls back to the legacy form on error.
