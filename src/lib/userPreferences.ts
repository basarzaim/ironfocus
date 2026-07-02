import {
  getPersistedValue,
  persistenceClient,
  setPersistedValue,
} from "./persistence/persistenceClient";
import { STORAGE_KEYS } from "./storageKeys";

export type RetentionPolicy = "all" | 90 | 180 | 365;
export type VisualQuality = "auto" | "high" | "low";

export type UserPreferences = {
  notificationsEnabled: boolean;
  completionSoundEnabled: boolean;
  retentionPolicy: RetentionPolicy;
  lastRetentionRunAt: string | null;
  visualQuality: VisualQuality;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  completionSoundEnabled: true,
  retentionPolicy: "all",
  lastRetentionRunAt: null,
  visualQuality: "auto",
};

function isRetentionPolicy(value: unknown): value is RetentionPolicy {
  return value === "all" || value === 90 || value === 180 || value === 365;
}

function isVisualQuality(value: unknown): value is VisualQuality {
  return value === "auto" || value === "high" || value === "low";
}

export function loadUserPreferences(): UserPreferences {
  try {
    const raw = getPersistedValue(STORAGE_KEYS.userPreferences);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      notificationsEnabled:
        parsed.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
      completionSoundEnabled:
        parsed.completionSoundEnabled ??
        DEFAULT_PREFERENCES.completionSoundEnabled,
      retentionPolicy: isRetentionPolicy(parsed.retentionPolicy)
        ? parsed.retentionPolicy
        : DEFAULT_PREFERENCES.retentionPolicy,
      lastRetentionRunAt:
        typeof parsed.lastRetentionRunAt === "string"
          ? parsed.lastRetentionRunAt
          : DEFAULT_PREFERENCES.lastRetentionRunAt,
      visualQuality: isVisualQuality(parsed.visualQuality)
        ? parsed.visualQuality
        : DEFAULT_PREFERENCES.visualQuality,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    setPersistedValue(
      STORAGE_KEYS.userPreferences,
      JSON.stringify(preferences),
    );
  } catch {
    persistenceClient.getLastWriteError();
  }
}

export function getRetentionDays(policy: RetentionPolicy): number | null {
  if (policy === "all") return null;
  return policy;
}

export function resolveVisualQuality(
  preference: VisualQuality,
  prefersReducedMotion: boolean,
): "high" | "low" {
  if (prefersReducedMotion) return "low";
  if (preference === "low") return "low";
  if (preference === "high") return "high";

  if (typeof navigator !== "undefined") {
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores <= 4) return "low";
  }

  return "high";
}

export function pruneLogsByRetention(
  logs: { date: string; id: string }[],
  retentionDays: number | null,
  now = new Date(),
): { kept: string[]; removedCount: number } {
  if (retentionDays === null) {
    return { kept: logs.map((l) => l.id), removedCount: 0 };
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const kept: string[] = [];
  let removedCount = 0;

  for (const log of logs) {
    if (log.date < cutoffIso) {
      removedCount += 1;
    } else {
      kept.push(log.id);
    }
  }

  return { kept, removedCount };
}
