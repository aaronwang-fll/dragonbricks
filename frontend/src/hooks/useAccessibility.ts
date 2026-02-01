import { useState, useEffect, useCallback } from 'react';
import {
  prefersReducedMotion,
  prefersHighContrast,
  onPrefersReducedMotionChange,
  onPrefersHighContrastChange,
  announce,
  createShortcutHandler,
  type KeyboardShortcut,
} from '../lib/accessibility';

interface AccessibilityState {
  reducedMotion: boolean;
  highContrast: boolean;
  manualHighContrast: boolean | null; // null = follow system
}

/**
 * Hook for managing accessibility preferences
 */
export function useAccessibility() {
  const [state, setState] = useState<AccessibilityState>(() => ({
    reducedMotion: prefersReducedMotion(),
    highContrast: prefersHighContrast(),
    manualHighContrast: null,
  }));

  // Listen for system preference changes
  useEffect(() => {
    const unsubscribeMotion = onPrefersReducedMotionChange((prefersReduced) => {
      setState((prev) => ({ ...prev, reducedMotion: prefersReduced }));
    });

    const unsubscribeContrast = onPrefersHighContrastChange((highContrast) => {
      setState((prev) => ({ ...prev, highContrast }));
    });

    return () => {
      unsubscribeMotion();
      unsubscribeContrast();
    };
  }, []);

  // Apply high contrast mode to document
  useEffect(() => {
    const shouldApplyHighContrast =
      state.manualHighContrast !== null
        ? state.manualHighContrast
        : state.highContrast;

    if (shouldApplyHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [state.manualHighContrast, state.highContrast]);

  // Apply reduced motion preference
  useEffect(() => {
    if (state.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [state.reducedMotion]);

  const toggleHighContrast = useCallback(() => {
    setState((prev) => {
      const currentEffective =
        prev.manualHighContrast !== null
          ? prev.manualHighContrast
          : prev.highContrast;

      return {
        ...prev,
        manualHighContrast: !currentEffective,
      };
    });
  }, []);

  const resetHighContrast = useCallback(() => {
    setState((prev) => ({
      ...prev,
      manualHighContrast: null,
    }));
  }, []);

  const isHighContrastEnabled =
    state.manualHighContrast !== null
      ? state.manualHighContrast
      : state.highContrast;

  return {
    reducedMotion: state.reducedMotion,
    highContrast: isHighContrastEnabled,
    isSystemHighContrast: state.highContrast,
    isManualHighContrast: state.manualHighContrast !== null,
    toggleHighContrast,
    resetHighContrast,
    announce,
  };
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = createShortcutHandler(shortcuts);
    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [shortcuts, enabled]);
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  const [lastFocusedElement, setLastFocusedElement] =
    useState<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    setLastFocusedElement(document.activeElement as HTMLElement);
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
  }, [lastFocusedElement]);

  return { saveFocus, restoreFocus, lastFocusedElement };
}

/**
 * Hook for skip link functionality
 */
export function useSkipLink() {
  const skipToMain = useCallback(() => {
    const main =
      document.querySelector('main') || document.querySelector('[role="main"]');
    if (main instanceof HTMLElement) {
      main.tabIndex = -1;
      main.focus();
      main.addEventListener(
        'blur',
        () => {
          main.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  }, []);

  const skipToContent = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.tabIndex = -1;
      element.focus();
      element.addEventListener(
        'blur',
        () => {
          element.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  }, []);

  return { skipToMain, skipToContent };
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const announcePolite = useCallback((message: string) => {
    announce(message, 'polite');
  }, []);

  const announceAssertive = useCallback((message: string) => {
    announce(message, 'assertive');
  }, []);

  return { announcePolite, announceAssertive };
}
