import { create } from 'zustand';

export type ConsoleEntryType = 'stdout' | 'stderr' | 'status';

export interface ConsoleEntry {
  id: string;
  ts: number; // epoch ms
  type: ConsoleEntryType;
  text: string;
}

interface ConsoleState {
  entries: ConsoleEntry[];
  isOpen: boolean;
  height: number; // px
  autoScroll: boolean;

  addEntry: (entry: Omit<ConsoleEntry, 'id' | 'ts'> & { id?: string; ts?: number }) => void;
  addStdout: (text: string) => void;
  addStderr: (text: string) => void;
  addStatus: (text: string) => void;
  clear: () => void;

  setOpen: (open: boolean) => void;
  setHeight: (height: number) => void;
  setAutoScroll: (auto: boolean) => void;
}

function makeId(): string {
  return `log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  isOpen: true,
  height: 180,
  autoScroll: true,

  addEntry: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries,
        {
          id: entry.id ?? makeId(),
          ts: entry.ts ?? Date.now(),
          type: entry.type,
          text: entry.text,
        },
      ],
    })),

  addStdout: (text) => set((state) => ({
    entries: [...state.entries, { id: makeId(), ts: Date.now(), type: 'stdout', text }],
  })),

  addStderr: (text) => set((state) => ({
    entries: [...state.entries, { id: makeId(), ts: Date.now(), type: 'stderr', text }],
  })),

  addStatus: (text) => set((state) => ({
    entries: [...state.entries, { id: makeId(), ts: Date.now(), type: 'status', text }],
  })),

  clear: () => set({ entries: [] }),

  setOpen: (open) => set({ isOpen: open }),
  setHeight: (height) => set({ height }),
  setAutoScroll: (auto) => set({ autoScroll: auto }),
}));
