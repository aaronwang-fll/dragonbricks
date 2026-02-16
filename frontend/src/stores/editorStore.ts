import { create } from 'zustand';
import type { Program, ParsedCommand, Defaults } from '../types';
import { DEFAULT_VALUES } from '../types';
import { api } from '../lib/api';
import {
  isLocalProgramId,
  mapApiProgramToFrontendProgram,
  mapFrontendProgramToProgramCreate,
  mapFrontendProgramToProgramUpdate,
} from '../lib/programAdapters';

// Create initial default program
const initialProgram: Program = {
  id: 'program-initial',
  name: 'Untitled 1',
  setupSection: '',
  mainSection: '',
  routines: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  profileId: null,
};

interface EditorState {
  // Current program
  currentProgram: Program | null;
  programs: Program[];

  // Parsed commands
  commands: ParsedCommand[];
  generatedCode: string;

  // AI processing state
  isAiProcessing: boolean;

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
  setPrograms: (programs: Program[]) => void;
  replaceProgram: (id: string, program: Program) => void;
  addProgram: (program: Program) => void;
  updateProgram: (id: string, updates: Partial<Program>, options?: { sync?: boolean }) => void;
  deleteProgram: (id: string) => void;
  flushProgramSync: (id?: string) => Promise<void>;

  setCommands: (commands: ParsedCommand[]) => void;
  setGeneratedCode: (code: string) => void;
  updateCommand: (id: string, updates: Partial<ParsedCommand>) => void;

  toggleCommandExpanded: (id: string) => void;
  expandAllCommands: () => void;
  collapseAllCommands: () => void;

  setSetupHeight: (height: number) => void;
  setRoutinesHeight: (height: number) => void;
  setShowRoutines: (show: boolean) => void;
  setShowPythonPanel: (show: boolean) => void;
  setPythonPanelWidth: (width: number) => void;

  setDefaults: (defaults: Defaults) => void;
  updateDefaults: (updates: Partial<Defaults>) => void;

  setIsAiProcessing: (isProcessing: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const SAVE_DEBOUNCE_MS = 750;
  const pendingSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const pendingCreates = new Set<string>();

  const isCloudSyncEnabled = (): boolean => Boolean(api.getToken());

  const clearPendingSave = (programId: string) => {
    const timer = pendingSaveTimers.get(programId);
    if (timer) {
      clearTimeout(timer);
      pendingSaveTimers.delete(programId);
    }
  };

  const patchProgramInCloud = async (programId: string): Promise<void> => {
    clearPendingSave(programId);

    if (!isCloudSyncEnabled() || isLocalProgramId(programId)) {
      return;
    }

    const program = get().programs.find((candidate) => candidate.id === programId);
    if (!program || isLocalProgramId(program.id)) {
      return;
    }

    try {
      const updated = await api.updateProgram(
        program.id,
        mapFrontendProgramToProgramUpdate(program),
      );
      const syncedProgram = mapApiProgramToFrontendProgram(updated);

      set((state) => ({
        programs: state.programs.map((candidate) =>
          candidate.id === program.id
            ? { ...candidate, updatedAt: syncedProgram.updatedAt }
            : candidate,
        ),
        currentProgram:
          state.currentProgram?.id === program.id
            ? { ...state.currentProgram, updatedAt: syncedProgram.updatedAt }
            : state.currentProgram,
      }));
    } catch (error) {
      console.error('Failed to sync program update to backend:', error);
    }
  };

  const scheduleProgramPatch = (programId: string) => {
    if (!isCloudSyncEnabled()) {
      return;
    }

    clearPendingSave(programId);
    const timer = setTimeout(() => {
      void patchProgramInCloud(programId);
    }, SAVE_DEBOUNCE_MS);
    pendingSaveTimers.set(programId, timer);
  };

  const createProgramInCloud = async (programId: string): Promise<void> => {
    if (!isCloudSyncEnabled() || pendingCreates.has(programId) || !isLocalProgramId(programId)) {
      return;
    }

    const localProgram = get().programs.find((candidate) => candidate.id === programId);
    if (!localProgram || !isLocalProgramId(localProgram.id)) {
      return;
    }

    pendingCreates.add(programId);
    clearPendingSave(programId);

    try {
      const created = await api.createProgram(mapFrontendProgramToProgramCreate(localProgram));
      const cloudProgram = mapApiProgramToFrontendProgram(created);
      const latestLocal = get().programs.find((candidate) => candidate.id === programId);

      if (!latestLocal) {
        return;
      }

      const mergedProgram: Program = {
        ...latestLocal,
        id: cloudProgram.id,
        createdAt: cloudProgram.createdAt,
        updatedAt: cloudProgram.updatedAt,
      };

      set((state) => ({
        programs: state.programs.map((candidate) =>
          candidate.id === programId ? mergedProgram : candidate,
        ),
        currentProgram:
          state.currentProgram?.id === programId ? mergedProgram : state.currentProgram,
      }));

      scheduleProgramPatch(mergedProgram.id);
    } catch (error) {
      console.error('Failed to create program in backend:', error);
    } finally {
      pendingCreates.delete(programId);
    }
  };

  const flushProgramSync = async (programId?: string): Promise<void> => {
    const targetId = programId ?? get().currentProgram?.id;
    if (!targetId || !isCloudSyncEnabled()) {
      return;
    }

    clearPendingSave(targetId);
    const program = get().programs.find((candidate) => candidate.id === targetId);
    if (!program) {
      return;
    }

    if (isLocalProgramId(program.id)) {
      await createProgramInCloud(program.id);
      return;
    }

    await patchProgramInCloud(program.id);
  };

  return {
    currentProgram: initialProgram,
    programs: [initialProgram],
    commands: [],
    generatedCode: '',
    isAiProcessing: false,
    defaults: DEFAULT_VALUES,
    expandedCommands: new Set(),
    showRoutines: false,
    setupHeight: 150,
    routinesHeight: 200,
    showPythonPanel: false,
    pythonPanelWidth: 300,

    setCurrentProgram: (program) => {
      const previousId = get().currentProgram?.id;
      if (previousId && previousId !== program?.id) {
        void flushProgramSync(previousId);
      }
      set({ currentProgram: program });
    },

    setPrograms: (programs) => {
      const previousIds = new Set(get().programs.map((program) => program.id));
      const nextIds = new Set(programs.map((program) => program.id));
      previousIds.forEach((id) => {
        if (!nextIds.has(id)) {
          clearPendingSave(id);
          pendingCreates.delete(id);
        }
      });

      const currentId = get().currentProgram?.id;
      const nextCurrent = currentId
        ? (programs.find((program) => program.id === currentId) ?? programs[0] ?? null)
        : (programs[0] ?? null);

      set({ programs, currentProgram: nextCurrent });
    },

    replaceProgram: (id, program) =>
      set((state) => ({
        programs: state.programs.map((candidate) => (candidate.id === id ? program : candidate)),
        currentProgram: state.currentProgram?.id === id ? program : state.currentProgram,
      })),

    addProgram: (program) => {
      set((state) => ({
        programs: [...state.programs, program],
      }));

      if (isCloudSyncEnabled()) {
        void createProgramInCloud(program.id);
      }
    },

    updateProgram: (id, updates, options) => {
      set((state) => ({
        programs: state.programs.map((program) =>
          program.id === id ? { ...program, ...updates, updatedAt: new Date() } : program,
        ),
        currentProgram:
          state.currentProgram?.id === id
            ? { ...state.currentProgram, ...updates, updatedAt: new Date() }
            : state.currentProgram,
      }));

      if (options?.sync === false || !isCloudSyncEnabled()) {
        return;
      }

      const updatedProgram = get().programs.find((program) => program.id === id);
      if (!updatedProgram) {
        return;
      }

      if (isLocalProgramId(updatedProgram.id)) {
        void createProgramInCloud(updatedProgram.id);
        return;
      }

      scheduleProgramPatch(updatedProgram.id);
    },

    deleteProgram: (id) => {
      clearPendingSave(id);
      pendingCreates.delete(id);

      set((state) => ({
        programs: state.programs.filter((program) => program.id !== id),
        currentProgram: state.currentProgram?.id === id ? null : state.currentProgram,
      }));
    },

    flushProgramSync: (id) => flushProgramSync(id),

    setCommands: (commands) => set({ commands }),
    setGeneratedCode: (code) => set({ generatedCode: code }),

    updateCommand: (id, updates) =>
      set((state) => ({
        commands: state.commands.map((command) =>
          command.id === id ? { ...command, ...updates } : command,
        ),
      })),

    toggleCommandExpanded: (id) =>
      set((state) => {
        const newExpanded = new Set(state.expandedCommands);
        if (newExpanded.has(id)) {
          newExpanded.delete(id);
        } else {
          newExpanded.add(id);
        }
        return { expandedCommands: newExpanded };
      }),

    expandAllCommands: () =>
      set((state) => ({
        expandedCommands: new Set(state.commands.map((command) => command.id)),
      })),

    collapseAllCommands: () => set({ expandedCommands: new Set() }),

    setSetupHeight: (height) => set({ setupHeight: height }),
    setRoutinesHeight: (height) => set({ routinesHeight: height }),
    setShowRoutines: (show) => set({ showRoutines: show }),
    setShowPythonPanel: (show) => set({ showPythonPanel: show }),
    setPythonPanelWidth: (width) => set({ pythonPanelWidth: width }),

    setDefaults: (defaults) => set({ defaults }),
    updateDefaults: (updates) =>
      set((state) => ({
        defaults: { ...state.defaults, ...updates },
      })),

    setIsAiProcessing: (isProcessing) => set({ isAiProcessing: isProcessing }),
  };
});
