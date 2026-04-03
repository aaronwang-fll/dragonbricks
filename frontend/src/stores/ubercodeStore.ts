import { create } from 'zustand';
import type { UberCodeRun, ButtonMapping } from '../types/ubercode';
import { DEFAULT_BUTTON_MAPPING } from '../types/ubercode';

interface UberCodeState {
  runs: UberCodeRun[];
  buttonMapping: ButtonMapping;
  generatedCode: string;
  isGenerating: boolean;
  error: string | null;

  setRuns: (runs: UberCodeRun[]) => void;
  addRun: (run: UberCodeRun) => void;
  removeRun: (programId: string) => void;
  moveRun: (fromIndex: number, toIndex: number) => void;
  setButtonMapping: (mapping: ButtonMapping) => void;
  setGeneratedCode: (code: string) => void;
  setIsGenerating: (val: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  runs: [] as UberCodeRun[],
  buttonMapping: DEFAULT_BUTTON_MAPPING,
  generatedCode: '',
  isGenerating: false,
  error: null as string | null,
};

export const useUberCodeStore = create<UberCodeState>((set) => ({
  ...initialState,

  setRuns: (runs) => set({ runs }),
  addRun: (run) =>
    set((state) => ({
      runs: [...state.runs, run],
      generatedCode: '',
    })),
  removeRun: (programId) =>
    set((state) => ({
      runs: state.runs.filter((r) => r.programId !== programId),
      generatedCode: '',
    })),
  moveRun: (fromIndex, toIndex) =>
    set((state) => {
      const newRuns = [...state.runs];
      const [moved] = newRuns.splice(fromIndex, 1);
      newRuns.splice(toIndex, 0, moved);
      return { runs: newRuns, generatedCode: '' };
    }),
  setButtonMapping: (mapping) => set({ buttonMapping: mapping, generatedCode: '' }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
