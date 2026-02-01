import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveProfile,
  saveProgram,
  getAllProfiles,
  getAllPrograms,
  getSetting,
  saveSetting,
} from '../lib/storage/indexedDB';
import type { RobotProfile, Program } from '../types';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  error: string | null;
}

interface UseOfflineSyncReturn {
  state: SyncState;
  saveProfileOffline: (profile: RobotProfile) => Promise<void>;
  saveProgramOffline: (program: Program) => Promise<void>;
  loadProfiles: () => Promise<RobotProfile[]>;
  loadPrograms: () => Promise<Program[]>;
  sync: () => Promise<void>;
  clearError: () => void;
}

const PENDING_PROFILES_KEY = 'pendingProfileIds';
const PENDING_PROGRAMS_KEY = 'pendingProgramIds';
const LAST_SYNC_KEY = 'lastSyncTime';

/**
 * Hook for managing offline data synchronization
 *
 * Features:
 * - Tracks online/offline status
 * - Saves data locally when offline
 * - Tracks pending changes
 * - Syncs when back online
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    error: null,
  });

  const mountedRef = useRef(true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial state
  useEffect(() => {
    mountedRef.current = true;

    async function loadInitialState() {
      try {
        const [lastSync, pendingProfiles, pendingPrograms] = await Promise.all([
          getSetting<number>(LAST_SYNC_KEY),
          getSetting<string[]>(PENDING_PROFILES_KEY),
          getSetting<string[]>(PENDING_PROGRAMS_KEY),
        ]);

        if (mountedRef.current) {
          const pendingProfileCount = pendingProfiles?.length || 0;
          const pendingProgramCount = pendingPrograms?.length || 0;

          setState((prev) => ({
            ...prev,
            lastSyncTime: lastSync,
            pendingChanges: pendingProfileCount + pendingProgramCount,
          }));
        }
      } catch (error) {
        console.error('Failed to load offline sync state:', error);
      }
    }

    loadInitialState();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track pending profile changes
  const addPendingProfile = useCallback(async (profileId: string) => {
    const pending = (await getSetting<string[]>(PENDING_PROFILES_KEY)) || [];
    if (!pending.includes(profileId)) {
      pending.push(profileId);
      await saveSetting(PENDING_PROFILES_KEY, pending);
      setState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges + 1,
      }));
    }
  }, []);

  // Track pending program changes
  const addPendingProgram = useCallback(async (programId: string) => {
    const pending = (await getSetting<string[]>(PENDING_PROGRAMS_KEY)) || [];
    if (!pending.includes(programId)) {
      pending.push(programId);
      await saveSetting(PENDING_PROGRAMS_KEY, pending);
      setState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges + 1,
      }));
    }
  }, []);

  // Save profile locally (works offline)
  const saveProfileOffline = useCallback(
    async (profile: RobotProfile) => {
      try {
        await saveProfile(profile);
        await addPendingProfile(profile.id);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to save profile locally',
        }));
        throw error;
      }
    },
    [addPendingProfile]
  );

  // Save program locally (works offline)
  const saveProgramOffline = useCallback(
    async (program: Program) => {
      try {
        await saveProgram(program);
        await addPendingProgram(program.id);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: 'Failed to save program locally',
        }));
        throw error;
      }
    },
    [addPendingProgram]
  );

  // Load all profiles from local storage
  const loadProfiles = useCallback(async (): Promise<RobotProfile[]> => {
    try {
      return await getAllProfiles();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to load profiles',
      }));
      return [];
    }
  }, []);

  // Load all programs from local storage
  const loadPrograms = useCallback(async (): Promise<Program[]> => {
    try {
      return await getAllPrograms();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to load programs',
      }));
      return [];
    }
  }, []);

  // Sync pending changes to server (when online)
  const sync = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) {
      return;
    }

    setState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Get pending items
      const [pendingProfileIds, pendingProgramIds] = await Promise.all([
        getSetting<string[]>(PENDING_PROFILES_KEY),
        getSetting<string[]>(PENDING_PROGRAMS_KEY),
      ]);

      // In a real app, this would sync to a backend
      // For now, we just clear the pending lists since we're offline-first

      // TODO: When Supabase is integrated, sync here:
      // - Upload pending profiles to Supabase
      // - Upload pending programs to Supabase
      // - Handle conflicts (last-write-wins or user prompt)
      // - Download any remote changes

      // Clear pending lists after "sync"
      await saveSetting(PENDING_PROFILES_KEY, []);
      await saveSetting(PENDING_PROGRAMS_KEY, []);

      const now = Date.now();
      await saveSetting(LAST_SYNC_KEY, now);

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncTime: now,
          pendingChanges: 0,
        }));
      }

      console.log(
        `Synced ${pendingProfileIds?.length || 0} profiles, ${pendingProgramIds?.length || 0} programs`
      );
    } catch (error) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          error: 'Sync failed. Changes saved locally.',
        }));
      }
    }
  }, [state.isOnline, state.isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (state.isOnline && state.pendingChanges > 0 && !state.isSyncing) {
      // Delay sync slightly to avoid rapid reconnection issues
      const timeoutId = setTimeout(() => {
        sync();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [state.isOnline, state.pendingChanges, state.isSyncing, sync]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    saveProfileOffline,
    saveProgramOffline,
    loadProfiles,
    loadPrograms,
    sync,
    clearError,
  };
}

/**
 * Hook for displaying offline status indicator
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
