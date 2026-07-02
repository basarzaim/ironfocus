import { load, type Store } from "@tauri-apps/plugin-store";
import type { PersistenceAdapter } from "./types";

export const STORE_FILENAME = "ironfocus-data.json";

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await load(STORE_FILENAME, {
      defaults: {},
      autoSave: false,
    });
  }
  return storeInstance;
}

function deserializeValue(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

export class TauriStoreAdapter implements PersistenceAdapter {
  async get(key: string): Promise<string | null> {
    const store = await getStore();
    const raw = await store.get(key);
    return deserializeValue(raw);
  }

  async set(key: string, value: string): Promise<void> {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
  }

  async remove(key: string): Promise<void> {
    const store = await getStore();
    await store.delete(key);
    await store.save();
  }

  async keys(): Promise<string[]> {
    const store = await getStore();
    return store.keys();
  }
}

export async function flushTauriStore(): Promise<void> {
  if (!storeInstance) return;
  await storeInstance.save();
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
