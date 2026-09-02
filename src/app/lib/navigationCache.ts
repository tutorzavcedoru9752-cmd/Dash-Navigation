import type { Category } from '../hooks/useCategories';

const DATABASE_NAME = 'dash-navigation-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'navigation';
const FALLBACK_PREFIX = 'dash-navigation-cache:v1:';

export const NAVIGATION_CACHE_TTL_MS = 5 * 60 * 1000;

export type NavigationCacheRecord = {
  userId: string;
  categories: Category[];
  updatedAt: number;
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'userId' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const fallbackKey = (userId: string) => `${FALLBACK_PREFIX}${userId}`;

const readFallback = (userId: string): NavigationCacheRecord | null => {
  try {
    const raw = localStorage.getItem(fallbackKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavigationCacheRecord;
    return parsed.userId === userId && Array.isArray(parsed.categories) ? parsed : null;
  } catch {
    return null;
  }
};

export const readNavigationCache = async (userId: string): Promise<NavigationCacheRecord | null> => {
  if (typeof indexedDB === 'undefined') return readFallback(userId);
  try {
    const database = await openDatabase();
    const record = await new Promise<NavigationCacheRecord | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(userId);
      request.onsuccess = () => resolve(request.result as NavigationCacheRecord | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return record && Array.isArray(record.categories) ? record : null;
  } catch {
    return readFallback(userId);
  }
};

export const writeNavigationCache = async (record: NavigationCacheRecord): Promise<void> => {
  if (typeof indexedDB !== 'undefined') {
    try {
      const database = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
      try { localStorage.removeItem(fallbackKey(record.userId)); } catch {}
      return;
    } catch {
      // Fall back to localStorage when IndexedDB is unavailable or blocked.
    }
  }

  try { localStorage.setItem(fallbackKey(record.userId), JSON.stringify(record)); } catch {}
};

export const deleteNavigationCache = async (userId: string): Promise<void> => {
  try { localStorage.removeItem(fallbackKey(userId)); } catch {}
  if (typeof indexedDB === 'undefined') return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {}
};
