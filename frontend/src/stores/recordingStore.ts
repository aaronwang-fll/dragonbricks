import { create } from 'zustand';
import type { RecordedCommand, RecordingPhase } from '../types/recording';

interface RecordingState {
  phase: RecordingPhase;
  sampleCount: number;
  commands: RecordedCommand[];
  replayCode: string;
  elapsedMs: number;
  error: string | null;

  // Save dialog
  showSaveDialog: boolean;
  routineName: string;

  // Actions
  setPhase: (phase: RecordingPhase) => void;
  setSampleCount: (count: number) => void;
  setCommands: (commands: RecordedCommand[]) => void;
  setReplayCode: (code: string) => void;
  setElapsedMs: (ms: number) => void;
  setError: (error: string | null) => void;
  setShowSaveDialog: (show: boolean) => void;
  setRoutineName: (name: string) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as RecordingPhase,
  sampleCount: 0,
  commands: [] as RecordedCommand[],
  replayCode: '',
  elapsedMs: 0,
  error: null as string | null,
  showSaveDialog: false,
  routineName: '',
};

export const useRecordingStore = create<RecordingState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setSampleCount: (count) => set({ sampleCount: count }),
  setCommands: (commands) => set({ commands }),
  setReplayCode: (code) => set({ replayCode: code }),
  setElapsedMs: (ms) => set({ elapsedMs: ms }),
  setError: (error) => set({ error }),
  setShowSaveDialog: (show) => set({ showSaveDialog: show }),
  setRoutineName: (name) => set({ routineName: name }),
  reset: () => set(initialState),
}));
