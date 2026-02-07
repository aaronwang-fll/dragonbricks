import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const effectiveTheme = mode === 'system' ? getSystemTheme() : mode;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// Get initial mode from localStorage or default to 'system'
const getInitialMode = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('theme-mode');
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // localStorage not available (SSR or test environment)
    }
  }
  return 'dark';
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialMode = getInitialMode();

  // Apply initial theme
  if (typeof window !== 'undefined') {
    applyTheme(initialMode);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const state = useThemeStore.getState();
      if (state.mode === 'system') {
        applyTheme('system');
      }
    });
  }

  return {
    mode: initialMode,
    setMode: (mode) => {
      localStorage.setItem('theme-mode', mode);
      applyTheme(mode);
      set({ mode });
    },
  };
});
