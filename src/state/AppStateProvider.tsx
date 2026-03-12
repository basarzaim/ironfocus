import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Category, LogEntry } from "../types/models";
import { diffMinutes, parseTimeToDate } from "../lib/time";

type AppStateContextValue = {
  categories: Category[];
  logs: LogEntry[];
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  updateCategoryColor: (id: string, color: string) => void;
  deleteCategory: (id: string) => void;
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
  "#fbbf24", // amber
  "#f97316", // orange
  "#22d3ee", // cyan
  "#a855f7", // purple
  "#4ade80", // green
  "#38bdf8", // sky
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

type AppStateProviderProps = {
  children: ReactNode;
};

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [categories, setCategories] = useState<Category[]>(
    () => createInitialCategories(),
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);

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

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { ok: false as const, error: "Title is required." };
    }
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
      addCategory(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        const now = new Date().toISOString();
        setCategories((prev) => [
          ...prev,
          {
            id: `cat-${prev.length + 1}-${Date.now()}`,
            name: trimmed,
            color: DEFAULT_CATEGORY_COLORS[prev.length % DEFAULT_CATEGORY_COLORS.length],
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
    }),
    [categories, logs],
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

