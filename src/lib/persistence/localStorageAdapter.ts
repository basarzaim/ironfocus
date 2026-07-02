import type { PersistenceAdapter } from "./types";

export class LocalStorageAdapter implements PersistenceAdapter {
  async get(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }

  async keys(): Promise<string[]> {
    if (typeof window === "undefined") return [];
    return Object.keys(window.localStorage);
  }
}
