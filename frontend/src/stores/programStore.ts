import { create } from 'zustand';
import { api } from '../lib/api';
import type { Program, ProgramListItem, ProgramCreate } from '../lib/api';

interface ProgramState {
  programs: ProgramListItem[];
  currentProgram: Program | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: Date | null;

  // Actions
  loadPrograms: (teamId?: string) => Promise<void>;
  loadProgram: (programId: string) => Promise<void>;
  loadProgramByShareCode: (shareCode: string) => Promise<void>;
  createProgram: (data: ProgramCreate) => Promise<Program>;
  updateProgram: (programId: string, data: Partial<Program>) => Promise<void>;
  deleteProgram: (programId: string) => Promise<void>;
  forkProgram: (programId: string, name?: string) => Promise<Program>;
  saveCurrentProgram: () => Promise<void>;
  setCurrentProgram: (program: Program | null) => void;
  clearError: () => void;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  programs: [],
  currentProgram: null,
  isLoading: false,
  isSaving: false,
  error: null,
  lastSaved: null,

  loadPrograms: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const programs = await api.listPrograms(teamId);
      set({ programs, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load programs',
        isLoading: false
      });
    }
  },

  loadProgram: async (programId) => {
    set({ isLoading: true, error: null });
    try {
      const program = await api.getProgram(programId);
      set({ currentProgram: program, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load program',
        isLoading: false
      });
    }
  },

  loadProgramByShareCode: async (shareCode) => {
    set({ isLoading: true, error: null });
    try {
      const program = await api.getProgramByShareCode(shareCode);
      set({ currentProgram: program, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load shared program',
        isLoading: false
      });
    }
  },

  createProgram: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const program = await api.createProgram(data);
      set(state => ({
        programs: [{
          id: program.id,
          name: program.name,
          description: program.description,
          owner_id: program.owner_id,
          owner_username: program.owner?.username,
          team_id: program.team_id,
          is_public: program.is_public,
          version: program.version,
          created_at: program.created_at,
          updated_at: program.updated_at
        }, ...state.programs],
        currentProgram: program,
        isSaving: false,
        lastSaved: new Date()
      }));
      return program;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create program',
        isSaving: false
      });
      throw err;
    }
  },

  updateProgram: async (programId, data) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await api.updateProgram(programId, data);
      set(state => ({
        currentProgram: state.currentProgram?.id === programId ? updated : state.currentProgram,
        programs: state.programs.map(p =>
          p.id === programId
            ? { ...p, ...data, version: updated.version, updated_at: updated.updated_at }
            : p
        ),
        isSaving: false,
        lastSaved: new Date()
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update program',
        isSaving: false
      });
      throw err;
    }
  },

  deleteProgram: async (programId) => {
    try {
      await api.deleteProgram(programId);
      set(state => ({
        programs: state.programs.filter(p => p.id !== programId),
        currentProgram: state.currentProgram?.id === programId ? null : state.currentProgram
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete program'
      });
      throw err;
    }
  },

  forkProgram: async (programId, name) => {
    set({ isSaving: true, error: null });
    try {
      const forked = await api.forkProgram(programId, name);
      set(state => ({
        programs: [{
          id: forked.id,
          name: forked.name,
          description: forked.description,
          owner_id: forked.owner_id,
          owner_username: forked.owner?.username,
          team_id: forked.team_id,
          is_public: forked.is_public,
          version: forked.version,
          created_at: forked.created_at,
          updated_at: forked.updated_at
        }, ...state.programs],
        currentProgram: forked,
        isSaving: false
      }));
      return forked;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fork program',
        isSaving: false
      });
      throw err;
    }
  },

  saveCurrentProgram: async () => {
    const { currentProgram } = get();
    if (!currentProgram) return;

    await get().updateProgram(currentProgram.id, {
      setup_section: currentProgram.setup_section,
      main_section: currentProgram.main_section,
      routines: currentProgram.routines,
      defaults: currentProgram.defaults,
      generated_code: currentProgram.generated_code
    });
  },

  setCurrentProgram: (program) => {
    set({ currentProgram: program });
  },

  clearError: () => set({ error: null }),
}));
