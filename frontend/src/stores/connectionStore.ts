import { create } from 'zustand';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type ProgramStatus = 'idle' | 'running' | 'paused' | 'stopped';

// BluetoothDevice will be available in browsers with Web Bluetooth API
// Using a placeholder interface for now until we implement bluetooth
interface BluetoothDevicePlaceholder {
  id: string;
  name?: string;
}
type BluetoothDeviceType = BluetoothDevicePlaceholder | null;

interface ConnectionState {
  status: ConnectionStatus;
  programStatus: ProgramStatus;
  device: BluetoothDeviceType;
  error: string | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setProgramStatus: (status: ProgramStatus) => void;
  setDevice: (device: BluetoothDeviceType) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  programStatus: 'idle',
  device: null,
  error: null,

  setStatus: (status) => set({ status }),
  setProgramStatus: (status) => set({ programStatus: status }),
  setDevice: (device) => set({ device }),
  setError: (error) => set({ error }),

  disconnect: () => set({
    status: 'disconnected',
    programStatus: 'idle',
    device: null,
    error: null,
  }),
}));
