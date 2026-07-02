import type { Category, LogEntry } from "../../types/models";
import { STORAGE_KEYS } from "../storageKeys";

export type ParsedAppData = {
  categories: Category[];
  logs: LogEntry[];
  issues: string[];
};

function isCategoryArray(value: unknown): value is Category[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Category).id === "string" &&
        typeof (item as Category).name === "string",
    )
  );
}

function isLogArray(value: unknown): value is LogEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as LogEntry).id === "string" &&
        typeof (item as LogEntry).categoryId === "string",
    )
  );
}

function parseJsonArray<T>(
  raw: string | null,
  backupRaw: string | null,
  validator: (value: unknown) => value is T[],
  label: string,
): { value: T[]; issues: string[] } {
  const issues: string[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (validator(parsed)) return { value: parsed, issues };
      issues.push(`${label} data was invalid.`);
    } catch {
      issues.push(`${label} data could not be parsed.`);
    }
  }

  if (backupRaw) {
    try {
      const parsed = JSON.parse(backupRaw) as unknown;
      if (validator(parsed)) {
        issues.push(`${label} restored from backup copy.`);
        return { value: parsed, issues };
      }
    } catch {
      // ignore backup parse failure
    }
  }

  return { value: [], issues };
}

export function parsePersistedAppData(args: {
  categoriesRaw: string | null;
  categoriesBackupRaw: string | null;
  logsRaw: string | null;
  logsBackupRaw: string | null;
  createDefaultCategories: () => Category[];
}): ParsedAppData {
  const categoriesResult = parseJsonArray(
    args.categoriesRaw,
    args.categoriesBackupRaw,
    isCategoryArray,
    "Categories",
  );
  const logsResult = parseJsonArray(
    args.logsRaw,
    args.logsBackupRaw,
    isLogArray,
    "Logs",
  );

  const categories =
    categoriesResult.value.length > 0
      ? categoriesResult.value
      : args.createDefaultCategories();

  return {
    categories,
    logs: logsResult.value,
    issues: [...categoriesResult.issues, ...logsResult.issues],
  };
}

export function backupKeyFor(key: string): string {
  if (key === STORAGE_KEYS.categories) return STORAGE_KEYS.categoriesBackup;
  if (key === STORAGE_KEYS.logs) return STORAGE_KEYS.logsBackup;
  return `${key}.bak`;
}
