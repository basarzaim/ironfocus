import { STORAGE_KEYS } from "../storageKeys";
import type { PersistenceAdapter, PersistenceManifest } from "./types";

export const LEGACY_SIDEBAR_KEY = "ironfocus.sidebarCollapsed";

const MIGRATABLE_KEYS = [
  STORAGE_KEYS.categories,
  STORAGE_KEYS.logs,
  STORAGE_KEYS.theme,
  STORAGE_KEYS.colorMode,
  STORAGE_KEYS.onboardingCompleted,
  STORAGE_KEYS.userPreferences,
  STORAGE_KEYS.timerPlannedMinutes,
  STORAGE_KEYS.coreVariantPreview,
  STORAGE_KEYS.coreGrowthPreview,
  LEGACY_SIDEBAR_KEY,
] as const;

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseManifest(raw: string | null): PersistenceManifest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistenceManifest;
    if (parsed?.version === 2) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export async function migratePersistenceIfNeeded(
  adapter: PersistenceAdapter,
): Promise<PersistenceManifest> {
  const existingManifestRaw = await adapter.get(STORAGE_KEYS.persistenceManifest);
  const existing = parseManifest(existingManifestRaw);
  if (existing) return existing;

  let migratedCount = 0;

  for (const key of MIGRATABLE_KEYS) {
    const localValue = readLocalStorage(key);
    if (localValue === null) continue;

    const current = await adapter.get(key);
    if (current === null) {
      await adapter.set(key, localValue);
      migratedCount += 1;
    }

    if (key === LEGACY_SIDEBAR_KEY) {
      const sidebar = await adapter.get(STORAGE_KEYS.sidebarCollapsed);
      if (sidebar === null) {
        await adapter.set(STORAGE_KEYS.sidebarCollapsed, localValue);
      }
    }
  }

  const manifest: PersistenceManifest = {
    version: 2,
    migratedAt: new Date().toISOString(),
    source: migratedCount > 0 ? "localStorage" : "fresh",
  };

  await adapter.set(
    STORAGE_KEYS.persistenceManifest,
    JSON.stringify(manifest),
  );

  return manifest;
}

export function getMigratableKeysForTests(): readonly string[] {
  return MIGRATABLE_KEYS;
}
