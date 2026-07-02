import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Category, LogEntry } from "../types/models";
import { diffMinutes, parseTimeToDate } from "../lib/time";
import { STORAGE_KEYS } from "../lib/storageKeys";
import {
  createBackupPayload,
  mergeBackupData,
  parseBackupJson,
  replaceBackupData,
  type BackupPayload,
  type MergeResult,
} from "../lib/dataBackup";
import {
  getRetentionDays,
  loadUserPreferences,
  pruneLogsByRetention,
  saveUserPreferences,
} from "../lib/userPreferences";
import {
  getPersistedValue,
  persistenceClient,
  setPersistedValue,
} from "../lib/persistence/persistenceClient";
import { backupKeyFor, parsePersistedAppData } from "../lib/persistence/recover";
import type { AccentId } from "./ThemeProvider";

type AppStateContextValue = {
  categories: Category[];
  logs: LogEntry[];
  storageIssues: string[];
  storageWriteError: string | null;
  clearStorageWriteError: () => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  updateCategoryColor: (id: string, color: string) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (sourceId: string, targetId: string) => void;
  deleteLog: (id: string) => void;
  addLogFromForm: (input: {
    title: string;
    categoryId: string;
    tagsRaw: string;
    startTime: string;
    endTime: string;
    notes: string;
  }) => { ok: true } | { ok: false; error: string };
  updateLogFromForm: (input: {
    id: string;
    title: string;
    categoryId: string;
    tagsRaw: string;
    startTime: string;
    endTime: string;
    notes: string;
  }) => { ok: true } | { ok: false; error: string };
  exportSnapshot: (accentId?: AccentId) => BackupPayload;
  importSnapshotMerge: (
    payload: BackupPayload,
  ) => { ok: true; stats: MergeResult } | { ok: false; error: string };
  importSnapshotReplace: (
    payload: BackupPayload,
  ) => { ok: true } | { ok: false; error: string };
  importFromJson: (
    text: string,
    mode: "merge" | "replace",
  ) =>
    | { ok: true; stats?: MergeResult }
    | { ok: false; error: string };
  clearAllData: () => void;
  lastRetentionRemovedCount: number;
  pruneLogsByRetentionPolicy: () => number;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined,
);

const DEFAULT_CATEGORY_NAMES = [
  "University",
  "Deep Work",
  "Reading",
  "Training",
  "Admin",
  "Career",
];

const DEFAULT_CATEGORY_COLORS = [
  "#fbbf24",
  "#f97316",
  "#22d3ee",
  "#a855f7",
  "#4ade80",
  "#38bdf8",
];

function createInitialCategories(): Category[] {
  const now = new Date().toISOString();
  return DEFAULT_CATEGORY_NAMES.map((name, idx) => ({
    id: `cat-${idx + 1}`,
    name,
    color: DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length],
    createdAt: now,
  }));
}

function loadInitialAppData(): {
  categories: Category[];
  logs: LogEntry[];
  issues: string[];
} {
  const parsed = parsePersistedAppData({
    categoriesRaw: getPersistedValue(STORAGE_KEYS.categories),
    categoriesBackupRaw: getPersistedValue(STORAGE_KEYS.categoriesBackup),
    logsRaw: getPersistedValue(STORAGE_KEYS.logs),
    logsBackupRaw: getPersistedValue(STORAGE_KEYS.logsBackup),
    createDefaultCategories: createInitialCategories,
  });

  for (const issue of parsed.issues) {
    persistenceClient.addLoadIssue("app-data", issue);
  }

  return parsed;
}

function shouldRunRetentionToday(lastRunAt: string | null, now = new Date()): boolean {
  if (!lastRunAt) return true;
  const last = new Date(lastRunAt);
  return last.toDateString() !== now.toDateString();
}

type AppStateProviderProps = {
  children: ReactNode;
};

export function AppStateProvider({ children }: AppStateProviderProps) {
  const initialData = useMemo(() => loadInitialAppData(), []);
  const [categories, setCategories] = useState<Category[]>(
    initialData.categories,
  );
  const [logs, setLogs] = useState<LogEntry[]>(initialData.logs);
  const [storageIssues] = useState<string[]>(initialData.issues);
  const [storageWriteError, setStorageWriteError] = useState<string | null>(
    null,
  );
  const [lastRetentionRemovedCount, setLastRetentionRemovedCount] = useState(0);
  const categoriesBackupRef = useRef<string | null>(null);
  const logsBackupRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(categories);
      if (categoriesBackupRef.current !== serialized) {
        const previous = getPersistedValue(STORAGE_KEYS.categories);
        if (previous) {
          setPersistedValue(STORAGE_KEYS.categoriesBackup, previous);
        }
        categoriesBackupRef.current = serialized;
      }
      setPersistedValue(STORAGE_KEYS.categories, serialized);
    } catch {
      setStorageWriteError("Could not save categories.");
    }
  }, [categories]);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(logs);
      if (logsBackupRef.current !== serialized) {
        const previous = getPersistedValue(STORAGE_KEYS.logs);
        if (previous) {
          setPersistedValue(backupKeyFor(STORAGE_KEYS.logs), previous);
        }
        logsBackupRef.current = serialized;
      }
      setPersistedValue(STORAGE_KEYS.logs, serialized);
    } catch {
      setStorageWriteError("Could not save logs.");
    }
  }, [logs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const error = persistenceClient.getLastWriteError();
      if (error) setStorageWriteError(error);
    }, 500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const preferences = loadUserPreferences();
    const retentionDays = getRetentionDays(preferences.retentionPolicy);
    if (retentionDays === null) return;
    if (!shouldRunRetentionToday(preferences.lastRetentionRunAt)) return;

    setLogs((prev) => {
      const { kept, removedCount } = pruneLogsByRetention(prev, retentionDays);
      if (removedCount === 0) return prev;
      setLastRetentionRemovedCount(removedCount);
      const keptSet = new Set(kept);
      return prev.filter((log) => keptSet.has(log.id));
    });

    saveUserPreferences({
      ...preferences,
      lastRetentionRunAt: new Date().toISOString(),
    });
  }, []);

  function validateAndBuildLog(input: {
    id: string;
    title: string;
    categoryId: string;
    tagsRaw: string;
    startTime: string;
    endTime: string;
    notes: string;
    createdAt?: string;
  }): { ok: true; log: LogEntry } | { ok: false; error: string } {
    const { id, title, categoryId, tagsRaw, startTime, endTime, notes } = input;

    const trimmedTitle = title.trim() || "Session";
    if (!categoryId) {
      return { ok: false as const, error: "Category is required." };
    }
    if (!startTime || !endTime) {
      return {
        ok: false as const,
        error: "Start and end times are required.",
      };
    }

    const startDate = parseTimeToDate(startTime);
    const endDate = parseTimeToDate(endTime);
    if (!startDate || !endDate) {
      return {
        ok: false as const,
        error: "Invalid time format.",
      };
    }
    if (endDate <= startDate) {
      return {
        ok: false as const,
        error: "End time must be after start time.",
      };
    }

    const durationMinutes = diffMinutes(startDate, endDate);
    const createdAt = input.createdAt ?? new Date().toISOString();
    const date = startDate.toISOString().slice(0, 10);
    const tags =
      tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    return {
      ok: true as const,
      log: {
        id,
        title: trimmedTitle,
        categoryId,
        tags,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes,
        notes: notes.trim() || undefined,
        date,
        createdAt,
      },
    };
  }

  const value = useMemo<AppStateContextValue>(
    () => ({
      categories,
      logs,
      storageIssues,
      storageWriteError,
      clearStorageWriteError: () => {
        persistenceClient.clearWriteError();
        setStorageWriteError(null);
      },
      lastRetentionRemovedCount,
      addCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        const now = new Date().toISOString();
        setCategories((prev) => [
          ...prev,
          {
            id: `cat-${prev.length + 1}-${Date.now()}`,
            name: trimmed,
            color:
              DEFAULT_CATEGORY_COLORS[prev.length % DEFAULT_CATEGORY_COLORS.length],
            createdAt: now,
          },
        ]);
      },
      updateCategory(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
        );
      },
      updateCategoryColor(id, color) {
        const trimmed = color.trim();
        if (!trimmed) return;
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? { ...c, color: trimmed } : c)),
        );
      },
      deleteCategory(id) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setLogs((prev) => prev.filter((log) => log.categoryId !== id));
      },
      reorderCategories(sourceId, targetId) {
        if (sourceId === targetId) return;
        setCategories((prev) => {
          const sourceIndex = prev.findIndex((c) => c.id === sourceId);
          const targetIndex = prev.findIndex((c) => c.id === targetId);
          if (sourceIndex === -1 || targetIndex === -1) return prev;
          const next = [...prev];
          const [moved] = next.splice(sourceIndex, 1);
          next.splice(targetIndex, 0, moved);
          return next;
        });
      },
      deleteLog(id) {
        setLogs((prev) => prev.filter((log) => log.id !== id));
      },
      addLogFromForm({
        title,
        categoryId,
        tagsRaw,
        startTime,
        endTime,
        notes,
      }) {
        const build = validateAndBuildLog({
          id: `log-${Date.now()}`,
          title,
          categoryId,
          tagsRaw,
          startTime,
          endTime,
          notes,
        });
        if (!build.ok) return build;

        setLogs((prev) => [build.log, ...prev]);
        return { ok: true as const };
      },
      updateLogFromForm({ id, title, categoryId, tagsRaw, startTime, endTime, notes }) {
        const existing = logs.find((l) => l.id === id);
        if (!existing) {
          return { ok: false as const, error: "Log entry not found." };
        }

        const build = validateAndBuildLog({
          id,
          title,
          categoryId,
          tagsRaw,
          startTime,
          endTime,
          notes,
          createdAt: existing.createdAt,
        });
        if (!build.ok) return build;

        setLogs((prev) => prev.map((l) => (l.id === id ? build.log : l)));
        return { ok: true as const };
      },
      exportSnapshot(accentId) {
        return createBackupPayload(categories, logs, accentId);
      },
      importSnapshotMerge(payload) {
        const merged = mergeBackupData(categories, logs, payload);
        setCategories(merged.categories);
        setLogs(merged.logs);
        return { ok: true as const, stats: merged.stats };
      },
      importSnapshotReplace(payload) {
        const replaced = replaceBackupData(payload);
        setCategories(replaced.categories);
        setLogs(replaced.logs);
        return { ok: true as const };
      },
      importFromJson(text, mode) {
        const parsed = parseBackupJson(text);
        if (!parsed.ok) return parsed;
        if (mode === "merge") {
          const merged = mergeBackupData(categories, logs, parsed.data);
          setCategories(merged.categories);
          setLogs(merged.logs);
          return { ok: true as const, stats: merged.stats };
        }
        const replaced = replaceBackupData(parsed.data);
        setCategories(replaced.categories);
        setLogs(replaced.logs);
        return { ok: true as const };
      },
      clearAllData() {
        setCategories(createInitialCategories());
        setLogs([]);
      },
      pruneLogsByRetentionPolicy() {
        const preferences = loadUserPreferences();
        const retentionDays = getRetentionDays(preferences.retentionPolicy);
        if (retentionDays === null) return 0;

        let removedCount = 0;
        setLogs((prev) => {
          const result = pruneLogsByRetention(prev, retentionDays);
          removedCount = result.removedCount;
          if (removedCount === 0) return prev;
          setLastRetentionRemovedCount(removedCount);
          const keptSet = new Set(result.kept);
          return prev.filter((log) => keptSet.has(log.id));
        });

        saveUserPreferences({
          ...preferences,
          lastRetentionRunAt: new Date().toISOString(),
        });

        return removedCount;
      },
    }),
    [categories, logs, lastRetentionRemovedCount, storageIssues, storageWriteError],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
