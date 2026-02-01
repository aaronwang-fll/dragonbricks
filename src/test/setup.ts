import '@testing-library/jest-dom';

// Ensure localStorage is available
if (typeof globalThis.localStorage === 'undefined') {
  const localStorageMock = {
    getItem: (key: string) => localStorageMock.store[key] ?? null,
    setItem: (key: string, value: string) => {
      localStorageMock.store[key] = value;
    },
    removeItem: (key: string) => {
      delete localStorageMock.store[key];
    },
    clear: () => {
      localStorageMock.store = {};
    },
    store: {} as Record<string, string>,
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
  });
}

// Ensure matchMedia is available
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}
