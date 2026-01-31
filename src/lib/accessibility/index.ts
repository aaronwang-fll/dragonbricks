/**
 * Accessibility utilities for keyboard navigation and focus management
 */

/**
 * Trap focus within a container element
 * Useful for modals and dialogs
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);

  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift+Tab: moving backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  firstElement.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelector));
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = getOrCreateAnnouncer(priority);
  announcer.textContent = message;

  // Clear after announcement to allow repeated messages
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

/**
 * Get or create an ARIA live region for announcements
 */
function getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
  const id = `aria-announcer-${priority}`;
  let announcer = document.getElementById(id);

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = id;
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }

  return announcer;
}

/**
 * Handle arrow key navigation in a list
 */
export function handleListNavigation(
  e: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (index: number) => void,
  options: {
    wrap?: boolean;
    horizontal?: boolean;
  } = {}
): void {
  const { wrap = true, horizontal = false } = options;

  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';

  if (e.key === prevKey) {
    e.preventDefault();
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
      newIndex = wrap ? itemCount - 1 : 0;
    }
    onSelect(newIndex);
  } else if (e.key === nextKey) {
    e.preventDefault();
    let newIndex = currentIndex + 1;
    if (newIndex >= itemCount) {
      newIndex = wrap ? 0 : itemCount - 1;
    }
    onSelect(newIndex);
  } else if (e.key === 'Home') {
    e.preventDefault();
    onSelect(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    onSelect(itemCount - 1);
  }
}

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Skip link target management
 */
export function focusMainContent(): void {
  const main = document.querySelector('main') || document.querySelector('[role="main"]');
  if (main instanceof HTMLElement) {
    main.tabIndex = -1;
    main.focus();
    main.removeAttribute('tabindex');
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Listen for preference changes
 */
export function onPrefersReducedMotionChange(callback: (prefersReduced: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

export function onPrefersHighContrastChange(callback: (prefersHighContrast: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-contrast: more)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Create keyboard shortcut handler
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function createShortcutHandler(shortcuts: KeyboardShortcut[]): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatches = !!shortcut.shift === e.shiftKey;
      const altMatches = !!shortcut.alt === e.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  };
}

/**
 * Get human-readable shortcut string
 */
export function getShortcutString(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl) parts.push(isMac ? '⌘' : 'Ctrl');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
