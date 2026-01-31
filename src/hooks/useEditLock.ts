import { useState, useEffect, useCallback, useRef } from 'react';
import {
  acquireEditLock,
  releaseEditLock,
  getEditLock,
  LOCK_REFRESH_INTERVAL_MS,
  type EditLock,
} from '../lib/supabase/sharing';
import { getSupabaseClient } from '../lib/supabase/client';

interface UseEditLockState {
  hasLock: boolean;
  currentLock: EditLock | null;
  lockedByOther: boolean;
  lockedByUserId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseEditLockReturn extends UseEditLockState {
  acquireLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
  checkLock: () => Promise<void>;
}

/**
 * Hook for managing edit locks on programs
 *
 * Provides collaborative editing protection by:
 * - Acquiring locks when user starts editing
 * - Auto-refreshing locks to maintain ownership
 * - Releasing locks when done or on unmount
 * - Showing when another user has the lock
 */
export function useEditLock(programId: string | null): UseEditLockReturn {
  const [state, setState] = useState<UseEditLockState>({
    hasLock: false,
    currentLock: null,
    lockedByOther: false,
    lockedByUserId: null,
    isLoading: false,
    error: null,
  });

  const lockIdRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id || null);
      });
    }
  }, []);

  // Check current lock status
  const checkLock = useCallback(async () => {
    if (!programId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const lock = await getEditLock(programId);

      if (lock) {
        const isOurs = lock.userId === currentUserId;
        setState({
          hasLock: isOurs,
          currentLock: lock,
          lockedByOther: !isOurs,
          lockedByUserId: isOurs ? null : lock.userId,
          isLoading: false,
          error: null,
        });

        if (isOurs) {
          lockIdRef.current = lock.id;
        }
      } else {
        setState({
          hasLock: false,
          currentLock: null,
          lockedByOther: false,
          lockedByUserId: null,
          isLoading: false,
          error: null,
        });
        lockIdRef.current = null;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check lock status',
      }));
    }
  }, [programId, currentUserId]);

  // Acquire lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!programId) return false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const lock = await acquireEditLock(programId);

      if (lock) {
        lockIdRef.current = lock.id;
        setState({
          hasLock: true,
          currentLock: lock,
          lockedByOther: false,
          lockedByUserId: null,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        // Failed to acquire - check who has it
        await checkLock();
        return false;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to acquire lock',
      }));
      return false;
    }
  }, [programId, checkLock]);

  // Release lock
  const releaseLock = useCallback(async () => {
    if (!lockIdRef.current) return;

    try {
      await releaseEditLock(lockIdRef.current);
      lockIdRef.current = null;
      setState({
        hasLock: false,
        currentLock: null,
        lockedByOther: false,
        lockedByUserId: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }, []);

  // Set up auto-refresh when we have the lock
  useEffect(() => {
    if (state.hasLock && lockIdRef.current) {
      refreshIntervalRef.current = window.setInterval(async () => {
        // Refresh by re-acquiring
        const lock = await acquireEditLock(programId!);
        if (lock) {
          lockIdRef.current = lock.id;
          setState((prev) => ({ ...prev, currentLock: lock }));
        } else {
          // Lost the lock somehow
          setState((prev) => ({
            ...prev,
            hasLock: false,
            currentLock: null,
            error: 'Lock was lost',
          }));
          lockIdRef.current = null;
        }
      }, LOCK_REFRESH_INTERVAL_MS);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [state.hasLock, programId]);

  // Check lock status on mount and when programId changes
  useEffect(() => {
    if (programId && currentUserId) {
      checkLock();
    }
  }, [programId, currentUserId, checkLock]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockIdRef.current) {
        releaseEditLock(lockIdRef.current).catch(console.error);
      }
    };
  }, []);

  return {
    ...state,
    acquireLock,
    releaseLock,
    checkLock,
  };
}

/**
 * Display component for lock status
 */
export function useLockStatusMessage(state: UseEditLockState): string | null {
  if (state.isLoading) {
    return 'Checking edit access...';
  }

  if (state.lockedByOther) {
    return `Another user is currently editing this program. You can view but not edit.`;
  }

  if (state.hasLock) {
    return null; // No message needed when we have the lock
  }

  if (state.error) {
    return state.error;
  }

  return null;
}
