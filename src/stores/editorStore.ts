import { create } from 'zustand';
import type { Program, ParsedCommand, Defaults } from '../types';
import { DEFAULT_VALUES } from '../types';

interface EditorState {
  // Current program
  currentProgram: Program | null;
  programs: Program[];

  // Parsed commands
  commands: ParsedCommand[];

  // Defaults
  defaults: Defaults;

  // UI state
  expandedCommands: Set<string>;
  showRoutines: boolean;
  setupHeight: number;
  routinesHeight: number;
  showPythonPanel: boolean;
  pythonPanelWidth: number;

  // Actions
  setCurrentProgram: (program: Program | null) => void;
  addProgram: (program: Program) => void;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;

  setCommands: (commands: ParsedCommand[]) => void;
  updateCommand: (id: string, updates: Partial<ParsedCommand>) => void;

  toggleCommandExpanded: (id: string) => void;
  expandAllCommands: () => void;
  collapseAllCommands: () => void;

  setSetupHeight: (height: number) => void;
  setRoutinesHeight: (height: number) => void;
  setShowRoutines: (show: boolean) => void;
  setShowPythonPanel: (show: boolean) => void;
  setPythonPanelWidth: (width: number) => void;

  updateDefaults: (updates: Partial<Defaults>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentProgram: null,
  programs: [],
  commands: [],
  defaults: DEFAULT_VALUES,
  expandedCommands: new Set(),
  showRoutines: false,
  setupHeight: 150,
  routinesHeight: 200,
  showPythonPanel: false,
  pythonPanelWidth: 300,

  setCurrentProgram: (program) => set({ currentProgram: program }),

  addProgram: (program) => set((state) => ({
    programs: [...state.programs, program],
  })),

  updateProgram: (id, updates) => set((state) => ({
    programs: state.programs.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    ),
    currentProgram:
      state.currentProgram?.id === id
        ? { ...state.currentProgram, ...updates }
        : state.currentProgram,
  })),

  deleteProgram: (id) => set((state) => ({
    programs: state.programs.filter((p) => p.id !== id),
    currentProgram:
      state.currentProgram?.id === id ? null : state.currentProgram,
  })),

  setCommands: (commands) => set({ commands }),

  updateCommand: (id, updates) => set((state) => ({
    commands: state.commands.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  toggleCommandExpanded: (id) => set((state) => {
    const newExpanded = new Set(state.expandedCommands);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    return { expandedCommands: newExpanded };
  }),

  expandAllCommands: () => set((state) => ({
    expandedCommands: new Set(state.commands.map((c) => c.id)),
  })),

  collapseAllCommands: () => set({ expandedCommands: new Set() }),

  setSetupHeight: (height) => set({ setupHeight: height }),
  setRoutinesHeight: (height) => set({ routinesHeight: height }),
  setShowRoutines: (show) => set({ showRoutines: show }),
  setShowPythonPanel: (show) => set({ showPythonPanel: show }),
  setPythonPanelWidth: (width) => set({ pythonPanelWidth: width }),

  updateDefaults: (updates) => set((state) => ({
    defaults: { ...state.defaults, ...updates },
  })),
}));
