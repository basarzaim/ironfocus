import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "../storageKeys";
import type { PersistenceAdapter } from "./types";
import { migratePersistenceIfNeeded } from "./migrate";

class MemoryAdapter implements PersistenceAdapter {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.data.keys()];
  }

  snapshot(): Map<string, string> {
    return new Map(this.data);
  }
}

describe("migratePersistenceIfNeeded", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates localStorage keys once and stays idempotent", async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.logs,
      JSON.stringify([{ id: "log-1" }]),
    );

    const adapter = new MemoryAdapter();
    const first = await migratePersistenceIfNeeded(adapter);
    const second = await migratePersistenceIfNeeded(adapter);

    expect(first.source).toBe("localStorage");
    expect(second.source).toBe("localStorage");
    expect(await adapter.get(STORAGE_KEYS.logs)).toContain("log-1");
    expect(await adapter.get(STORAGE_KEYS.persistenceManifest)).toContain('"version":2');
  });
});
