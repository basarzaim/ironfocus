import type { Category, LogEntry } from "../types/models";
import { PRODUCT_INFO } from "../config/productInfo";
import { ACCENT_IDS, type AccentId } from "../state/ThemeProvider";

export const BACKUP_SCHEMA_VERSION = 1 as const;

export type BackupPayload = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  categories: Category[];
  logs: LogEntry[];
  /** Optional — absent in backups created before the accent theme system; falls back to "classic". */
  accentId?: AccentId;
};

function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && (ACCENT_IDS as string[]).includes(value);
}

export type MergeResult = {
  categoriesAdded: number;
  categoriesSkipped: number;
  logsAdded: number;
  logsSkipped: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.createdAt === "string" &&
    (value.color === undefined || typeof value.color === "string")
  );
}

function isLogEntry(value: unknown): value is LogEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.categoryId === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((t) => typeof t === "string") &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    typeof value.durationMinutes === "number" &&
    typeof value.date === "string" &&
    typeof value.createdAt === "string" &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

export function createBackupPayload(
  categories: Category[],
  logs: LogEntry[],
  accentId?: AccentId,
): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: PRODUCT_INFO.version,
    categories,
    logs,
    accentId,
  };
}

export function validateBackupPayload(
  raw: unknown,
): { ok: true; data: BackupPayload } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "Invalid backup file format." };
  }

  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version (expected ${BACKUP_SCHEMA_VERSION}).`,
    };
  }

  if (!Array.isArray(raw.categories) || !Array.isArray(raw.logs)) {
    return { ok: false, error: "Backup is missing categories or logs." };
  }

  if (!raw.categories.every(isCategory)) {
    return { ok: false, error: "Backup contains invalid category entries." };
  }

  if (!raw.logs.every(isLogEntry)) {
    return { ok: false, error: "Backup contains invalid log entries." };
  }

  const categoryIds = new Set(
    (raw.categories as Category[]).map((category) => category.id),
  );

  for (const log of raw.logs as LogEntry[]) {
    if (!categoryIds.has(log.categoryId)) {
      return {
        ok: false,
        error: `Log "${log.title}" references a missing category.`,
      };
    }
  }

  return {
    ok: true,
    data: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt:
        typeof raw.exportedAt === "string"
          ? raw.exportedAt
          : new Date().toISOString(),
      appVersion:
        typeof raw.appVersion === "string" ? raw.appVersion : "unknown",
      categories: raw.categories as Category[],
      logs: raw.logs as LogEntry[],
      accentId: isAccentId(raw.accentId) ? raw.accentId : "classic",
    },
  };
}

export function parseBackupJson(
  text: string,
): { ok: true; data: BackupPayload } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    return validateBackupPayload(parsed);
  } catch {
    return { ok: false, error: "Could not parse backup file as JSON." };
  }
}

export function mergeBackupData(
  localCategories: Category[],
  localLogs: LogEntry[],
  imported: BackupPayload,
): { categories: Category[]; logs: LogEntry[]; stats: MergeResult } {
  const categoryMap = new Map(localCategories.map((c) => [c.id, c]));
  let categoriesAdded = 0;
  let categoriesSkipped = 0;

  for (const category of imported.categories) {
    if (categoryMap.has(category.id)) {
      categoriesSkipped += 1;
      continue;
    }
    categoryMap.set(category.id, category);
    categoriesAdded += 1;
  }

  const mergedCategories = Array.from(categoryMap.values());

  const logMap = new Map(localLogs.map((l) => [l.id, l]));
  let logsAdded = 0;
  let logsSkipped = 0;

  for (const log of imported.logs) {
    if (logMap.has(log.id)) {
      logsSkipped += 1;
      continue;
    }
    if (!categoryMap.has(log.categoryId)) {
      logsSkipped += 1;
      continue;
    }
    logMap.set(log.id, log);
    logsAdded += 1;
  }

  const mergedLogs = Array.from(logMap.values()).sort(
    (a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return {
    categories: mergedCategories,
    logs: mergedLogs,
    stats: {
      categoriesAdded,
      categoriesSkipped,
      logsAdded,
      logsSkipped,
    },
  };
}

export function replaceBackupData(imported: BackupPayload): {
  categories: Category[];
  logs: LogEntry[];
} {
  return {
    categories: imported.categories,
    logs: [...imported.logs].sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    ),
  };
}
