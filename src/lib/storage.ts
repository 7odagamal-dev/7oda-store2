'use client';

const STORAGE_PREFIX = '7h-';

export function safeParseStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function safeSetStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded for key: ${key}`);
    }
    return false;
  }
}

export function safeRemoveStorage(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeParseArray<T>(key: string): T[] {
  const data = safeParseStorage<T[]>(key, []);
  return Array.isArray(data) ? data : [];
}

export class StorageService {
  private prefix: string;

  constructor(prefix = STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  private prefixed(key: string): string {
    return key.startsWith(this.prefix) ? key : `${this.prefix}${key}`;
  }

  get<T>(key: string, fallback: T): T {
    return safeParseStorage(this.prefixed(key), fallback);
  }

  set<T>(key: string, value: T): boolean {
    return safeSetStorage(this.prefixed(key), value);
  }

  update<T>(key: string, updater: (prev: T) => T, fallback: T): boolean {
    const current = this.get(key, fallback);
    return this.set(key, updater(current));
  }

  remove(key: string): boolean {
    return safeRemoveStorage(this.prefixed(key));
  }

  transaction<T>(key: string, action: (value: T) => T, fallback: T): T {
    const current = this.get(key, fallback);
    const next = action(current);
    this.set(key, next);
    return next;
  }

  backup(key: string): { data: unknown; timestamp: number } | null {
    const data = this.get<unknown>(key, null);
    if (data === null) return null;
    const backupKey = `backup_${key}_${Date.now()}`;
    const backup = { data, timestamp: Date.now() };
    this.set(backupKey, backup);
    return backup;
  }

  restore(backupKey: string): boolean {
    const backup = this.get<{ data: unknown; timestamp: number } | null>(backupKey, null);
    if (!backup) return false;
    const originalKey = backupKey.replace(/^backup_/, '').replace(/_\d+$/, '');
    return this.set(originalKey, backup.data);
  }

  validate<T>(key: string, validator: (value: unknown) => value is T): T | null {
    const data = this.get<unknown>(key, null);
    if (data === null) return null;
    return validator(data) ? data : null;
  }

  safeWrite<T>(key: string, value: T, validator?: (value: T) => boolean): boolean {
    if (validator && !validator(value)) return false;
    return this.set(key, value);
  }
}

export const storage = new StorageService();
