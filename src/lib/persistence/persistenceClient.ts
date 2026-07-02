import { STORAGE_KEYS } from "../storageKeys";
import { LocalStorageAdapter } from "./localStorageAdapter";
import { migratePersistenceIfNeeded } from "./migrate";
import { TauriStoreAdapter, isTauriRuntime } from "./tauriStoreAdapter";
import type { PersistenceAdapter, PersistenceLoadIssue } from "./types";

const WRITE_DEBOUNCE_MS = 300;

class PersistenceClient {
  private adapter: PersistenceAdapter | null = null;
  private memory = new Map<string, string>();
  private pending = new Map<string, string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWriteError: string | null = null;
  private loadIssues: PersistenceLoadIssue[] = [];
  private ready = false;

  isReady(): boolean {
    return this.ready;
  }

  getLastWriteError(): string | null {
    return this.lastWriteError;
  }

  getLoadIssues(): PersistenceLoadIssue[] {
    return this.loadIssues;
  }

  clearWriteError(): void {
    this.lastWriteError = null;
  }

  addLoadIssue(key: string, message: string): void {
    this.loadIssues.push({ key, message });
  }

  async bootstrap(): Promise<void> {
    this.adapter =
      isTauriRuntime() ? new TauriStoreAdapter() : new LocalStorageAdapter();

    await migratePersistenceIfNeeded(this.adapter);

    const keys = await this.adapter.keys();
    for (const key of keys) {
      const value = await this.adapter.get(key);
      if (value !== null) this.memory.set(key, value);
    }

    for (const key of Object.values(STORAGE_KEYS)) {
      if (this.memory.has(key)) continue;
      const value = await this.adapter.get(key);
      if (value !== null) this.memory.set(key, value);
    }

    this.ready = true;
  }

  get(key: string): string | null {
    return this.memory.get(key) ?? null;
  }

  set(key: string, value: string): void {
    if (value === "") {
      this.memory.delete(key);
    } else {
      this.memory.set(key, value);
    }
    this.pending.set(key, value);
    this.scheduleFlush();
  }

  remove(key: string): void {
    this.memory.delete(key);
    this.pending.set(key, "");
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      void this.flushPending();
    }, WRITE_DEBOUNCE_MS);
  }

  async flushPending(): Promise<void> {
    if (!this.adapter || this.pending.size === 0) return;

    const batch = new Map(this.pending);
    this.pending.clear();

    for (const [key, value] of batch) {
      try {
        if (value === "") {
          await this.adapter.remove(key);
        } else {
          await this.adapter.set(key, value);
        }
        this.lastWriteError = null;
      } catch (error) {
        this.lastWriteError =
          error instanceof Error
            ? error.message
            : "Could not save data to disk.";
      }
    }
  }
}

export const persistenceClient = new PersistenceClient();

export function getPersistedValue(key: string): string | null {
  return persistenceClient.get(key);
}

export function setPersistedValue(key: string, value: string): void {
  persistenceClient.set(key, value);
}

export function removePersistedValue(key: string): void {
  persistenceClient.remove(key);
}

export async function bootstrapPersistence(): Promise<void> {
  await persistenceClient.bootstrap();
}
