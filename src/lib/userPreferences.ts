import { STORAGE_KEYS } from "./storageKeys";

export type RetentionPolicy = "all" | 90 | 180 | 365;

export type UserPreferences = {
  notificationsEnabled: boolean;
  completionSoundEnabled: boolean;
  retentionPolicy: RetentionPolicy;
  lastRetentionRunAt: string | null;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  completionSoundEnabled: true,
  retentionPolicy: "all",
  lastRetentionRunAt: null,
};

function isRetentionPolicy(value: unknown): value is RetentionPolicy {
  return value === "all" || value === 90 || value === 180 || value === 365;
}

export function loadUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.userPreferences);
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
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveUserPreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.userPreferences,
      JSON.stringify(preferences),
    );
  } catch {
    // ignore storage errors
  }
}

export function getRetentionDays(policy: RetentionPolicy): number | null {
  if (policy === "all") return null;
  return policy;
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
