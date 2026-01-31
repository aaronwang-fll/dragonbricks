import type { RobotProfile, Program } from '../../types';

const DB_NAME = 'dragonbricks';
const DB_VERSION = 1;

// Store names
const STORES = {
  PROFILES: 'profiles',
  PROGRAMS: 'programs',
  SETTINGS: 'settings',
} as const;

interface Settings {
  key: string;
  value: unknown;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create profiles store
      if (!db.objectStoreNames.contains(STORES.PROFILES)) {
        const profileStore = db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
        profileStore.createIndex('name', 'name', { unique: false });
        profileStore.createIndex('isDefault', 'isDefault', { unique: false });
      }

      // Create programs store
      if (!db.objectStoreNames.contains(STORES.PROGRAMS)) {
        const programStore = db.createObjectStore(STORES.PROGRAMS, { keyPath: 'id' });
        programStore.createIndex('profileId', 'profileId', { unique: false });
        programStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ============ Profile Operations ============

export async function saveProfile(profile: RobotProfile): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILES, 'readwrite');
    const store = transaction.objectStore(STORES.PROFILES);

    const request = store.put(profile);

    request.onerror = () => reject(new Error('Failed to save profile'));
    request.onsuccess = () => resolve();
  });
}

export async function getProfile(id: string): Promise<RobotProfile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILES, 'readonly');
    const store = transaction.objectStore(STORES.PROFILES);

    const request = store.get(id);

    request.onerror = () => reject(new Error('Failed to get profile'));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllProfiles(): Promise<RobotProfile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILES, 'readonly');
    const store = transaction.objectStore(STORES.PROFILES);

    const request = store.getAll();

    request.onerror = () => reject(new Error('Failed to get profiles'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROFILES, 'readwrite');
    const store = transaction.objectStore(STORES.PROFILES);

    const request = store.delete(id);

    request.onerror = () => reject(new Error('Failed to delete profile'));
    request.onsuccess = () => resolve();
  });
}

// ============ Program Operations ============

export async function saveProgram(program: Program): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROGRAMS, 'readwrite');
    const store = transaction.objectStore(STORES.PROGRAMS);

    const programWithTimestamp = {
      ...program,
      updatedAt: Date.now(),
    };

    const request = store.put(programWithTimestamp);

    request.onerror = () => reject(new Error('Failed to save program'));
    request.onsuccess = () => resolve();
  });
}

export async function getProgram(id: string): Promise<Program | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROGRAMS, 'readonly');
    const store = transaction.objectStore(STORES.PROGRAMS);

    const request = store.get(id);

    request.onerror = () => reject(new Error('Failed to get program'));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function getAllPrograms(): Promise<Program[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROGRAMS, 'readonly');
    const store = transaction.objectStore(STORES.PROGRAMS);

    const request = store.getAll();

    request.onerror = () => reject(new Error('Failed to get programs'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function getProgramsByProfile(profileId: string): Promise<Program[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROGRAMS, 'readonly');
    const store = transaction.objectStore(STORES.PROGRAMS);
    const index = store.index('profileId');

    const request = index.getAll(profileId);

    request.onerror = () => reject(new Error('Failed to get programs'));
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteProgram(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PROGRAMS, 'readwrite');
    const store = transaction.objectStore(STORES.PROGRAMS);

    const request = store.delete(id);

    request.onerror = () => reject(new Error('Failed to delete program'));
    request.onsuccess = () => resolve();
  });
}

// ============ Settings Operations ============

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);

    const setting: Settings = { key, value };
    const request = store.put(setting);

    request.onerror = () => reject(new Error('Failed to save setting'));
    request.onsuccess = () => resolve();
  });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);

    const request = store.get(key);

    request.onerror = () => reject(new Error('Failed to get setting'));
    request.onsuccess = () => {
      const result = request.result as Settings | undefined;
      resolve(result ? (result.value as T) : null);
    };
  });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);

    const request = store.delete(key);

    request.onerror = () => reject(new Error('Failed to delete setting'));
    request.onsuccess = () => resolve();
  });
}

// ============ Utility Operations ============

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.PROFILES, STORES.PROGRAMS, STORES.SETTINGS],
      'readwrite'
    );

    transaction.onerror = () => reject(new Error('Failed to clear data'));
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORES.PROFILES).clear();
    transaction.objectStore(STORES.PROGRAMS).clear();
    transaction.objectStore(STORES.SETTINGS).clear();
  });
}

/**
 * Export all data as JSON
 */
export async function exportData(): Promise<{
  profiles: RobotProfile[];
  programs: Program[];
}> {
  const [profiles, programs] = await Promise.all([
    getAllProfiles(),
    getAllPrograms(),
  ]);

  return { profiles, programs };
}

/**
 * Import data from JSON
 */
export async function importData(data: {
  profiles?: RobotProfile[];
  programs?: Program[];
}): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.PROFILES, STORES.PROGRAMS],
      'readwrite'
    );

    transaction.onerror = () => reject(new Error('Failed to import data'));
    transaction.oncomplete = () => resolve();

    const profileStore = transaction.objectStore(STORES.PROFILES);
    const programStore = transaction.objectStore(STORES.PROGRAMS);

    // Import profiles
    if (data.profiles) {
      for (const profile of data.profiles) {
        profileStore.put(profile);
      }
    }

    // Import programs
    if (data.programs) {
      for (const program of data.programs) {
        programStore.put(program);
      }
    }
  });
}
