import { create } from 'zustand';
import { api } from '../lib/api';
import type { User, Team } from '../lib/api';

interface AuthState {
  user: User | null;
  teams: Team[];
  currentTeamId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  loadTeams: () => Promise<void>;
  setCurrentTeam: (teamId: string | null) => void;
  createTeam: (name: string, description?: string) => Promise<Team>;
  joinTeam: (teamId: string, inviteCode: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  teams: [],
  currentTeamId: localStorage.getItem('current_team_id'),
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
      await get().loadTeams();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Login failed',
        isLoading: false
      });
      throw err;
    }
  },

  register: async (email, username, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await api.register(email, username, password, fullName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Registration failed',
        isLoading: false
      });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({
      user: null,
      teams: [],
      currentTeamId: null,
      isAuthenticated: false
    });
    localStorage.removeItem('current_team_id');
  },

  checkAuth: async () => {
    if (!api.getToken()) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
      await get().loadTeams();
    } catch {
      api.logout();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  loadTeams: async () => {
    try {
      const teams = await api.listTeams();
      set({ teams });
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  },

  setCurrentTeam: (teamId) => {
    set({ currentTeamId: teamId });
    if (teamId) {
      localStorage.setItem('current_team_id', teamId);
    } else {
      localStorage.removeItem('current_team_id');
    }
  },

  createTeam: async (name, description) => {
    const team = await api.createTeam(name, description);
    set(state => ({ teams: [...state.teams, team] }));
    return team;
  },

  joinTeam: async (teamId, inviteCode) => {
    const team = await api.joinTeam(teamId, inviteCode);
    set(state => ({ teams: [...state.teams, team] }));
  },

  leaveTeam: async (teamId) => {
    await api.leaveTeam(teamId);
    set(state => ({
      teams: state.teams.filter(t => t.id !== teamId),
      currentTeamId: state.currentTeamId === teamId ? null : state.currentTeamId
    }));
  },

  clearError: () => set({ error: null }),
}));
