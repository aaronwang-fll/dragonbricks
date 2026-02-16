import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: !!api.getToken(), // Start loading if token exists
  error: null,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false, error: null }),

  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false, error: null }),

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      // Token is invalid, clear it
      api.logout();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },
}));
