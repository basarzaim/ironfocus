import { useMemo, useState } from "react";
import { useAppState } from "../state/AppStateProvider";
import { formatMinutesHuman } from "../lib/time";
import { QuickLogPanel } from "../components/dashboard/QuickLogPanel";
import { useTheme } from "../state/ThemeProvider";

type SortKey = "date_desc" | "date_asc" | "duration_desc" | "duration_asc";
type RangeKey = "all" | "today" | "week" | "month";

export function LogsPage() {
  const { logs, categories, deleteLog, updateLogFromForm } = useAppState();
  const { theme } = useTheme();
  const isWife = theme === "wife";
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [rangeKey, setRangeKey] = useState<RangeKey>("all");
  const [rangeOffset, setRangeOffset] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTagsRaw, setEditTagsRaw] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  // Compute the active time window based on rangeKey + offset
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  if (rangeKey === "today") {
    const d = new Date(today);
    d.setDate(d.getDate() + rangeOffset);
    rangeStart = new Date(d);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(d);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (rangeKey === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + rangeOffset * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    rangeStart = start;
    rangeEnd = end;
  } else if (rangeKey === "month") {
    const base = new Date(today);
    base.setMonth(base.getMonth() + rangeOffset, 15);
    const year = base.getFullYear();
    const month = base.getMonth();
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    rangeStart = start;
    rangeEnd = end;
  }

  let rangeLabel = "";
  if (rangeKey === "today" && rangeStart) {
    const labelDate = rangeStart.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    rangeLabel = rangeOffset === 0 ? `Today • ${labelDate}` : labelDate;
  } else if (rangeKey === "week" && rangeStart && rangeEnd) {
    const startLabel = rangeStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endLabel = rangeEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    rangeLabel = `Week • ${startLabel} – ${endLabel}`;
  } else if (rangeKey === "month" && rangeStart) {
    rangeLabel = rangeStart.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const filteredLogs = logs
    .filter((log) =>
      selectedCategoryId === "all" ? true : log.categoryId === selectedCategoryId,
    )
    .filter((log) => {
      if (!fromDate && !toDate) return true;
      if (fromDate && log.date < fromDate) return false;
      if (toDate && log.date > toDate) return false;
      return true;
    })
    .filter((log) => {
      if (!rangeStart || !rangeEnd || rangeKey === "all") return true;
      const d = new Date(log.startTime);
      return d >= rangeStart && d <= rangeEnd;
    })
    .filter((log) => {
      if (!normalizedQuery) return true;
      const haystack = `${log.title} ${log.notes ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice()
    .sort((a, b) => {
      switch (sortKey) {
        case "date_asc":
          return a.startTime.localeCompare(b.startTime);
        case "date_desc":
          return b.startTime.localeCompare(a.startTime);
        case "duration_asc":
          return a.durationMinutes - b.durationMinutes;
        case "duration_desc":
          return b.durationMinutes - a.durationMinutes;
        default:
          return 0;
      }
    });

  function beginEdit(logId: string) {
    const log = logs.find((l) => l.id === logId);
    if (!log) return;

    const start = new Date(log.startTime);
    const end = new Date(log.endTime);
    const toTime = (d: Date) =>
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    setEditingId(log.id);
    setEditTitle(log.title);
    setEditCategoryId(log.categoryId);
    setEditTagsRaw(log.tags.join(", "));
    setEditStartTime(toTime(start));
    setEditEndTime(toTime(end));
    setEditNotes(log.notes ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditCategoryId("");
    setEditTagsRaw("");
    setEditStartTime("");
    setEditEndTime("");
    setEditNotes("");
    setEditError(null);
  }

  function saveEdit() {
    if (!editingId) return;
    const result = updateLogFromForm({
      id: editingId,
      title: editTitle,
      categoryId: editCategoryId,
      tagsRaw: editTagsRaw,
      startTime: editStartTime,
      endTime: editEndTime,
      notes: editNotes,
    });
    if (!result.ok) {
      setEditError(result.error);
      return;
    }
    cancelEdit();
  }

  const canGoForward = rangeOffset < 0;

  const filteredStats = useMemo(() => {
    const totalMinutes = filteredLogs.reduce(
      (acc, log) => acc + log.durationMinutes,
      0,
    );
    return { count: filteredLogs.length, totalMinutes };
  }, [filteredLogs]);

  const accentFocus = isWife
    ? "focus:border-pink-500/70"
    : "focus:border-amber-500/70";
  const accentRing = isWife ? "ring-pink-500/40" : "ring-amber-500/40";
  const accentBg = isWife
    ? "bg-pink-500/15 text-pink-300"
    : "bg-amber-500/15 text-amber-300";
  const accentBtn = isWife
    ? "border-pink-500/60 bg-pink-600/80 text-neutral-50 hover:bg-pink-500"
    : "border-amber-500/60 bg-amber-600/80 text-neutral-950 hover:bg-amber-500";
  const accentNavHover = isWife
    ? "hover:border-pink-500/50 hover:text-pink-300"
    : "hover:border-amber-500/50 hover:text-amber-400";
  const segmentTrack =
    "inline-flex items-center gap-0.5 rounded-full border border-neutral-800/80 bg-neutral-950/50 p-1 backdrop-blur-sm";
  const segmentActive = isWife
    ? "bg-pink-500 text-white shadow-sm shadow-pink-950/30 ring-1 ring-pink-400/30"
    : "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-950/30 ring-1 ring-amber-400/40";
  const segmentInactive =
    "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-200";
  const fieldClass = `w-full rounded-lg border border-neutral-800/80 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 ${accentFocus}`;
  const panelClass =
    "zs-panel overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 ring-1 ring-white/[0.03]";

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 px-5 py-4 ring-1 ring-white/[0.03]">
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
            isWife ? "bg-pink-500/10" : "bg-amber-500/10"
          }`}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Session archive
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-50">
              Logs
            </h1>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
              All recorded focus sessions and manual entries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border border-neutral-800/80 px-3 py-1 text-[11px] font-medium tabular-nums text-neutral-300 ${accentBg}`}
            >
              {filteredStats.count}{" "}
              {filteredStats.count === 1 ? "entry" : "entries"}
            </span>
            {filteredStats.count > 0 ? (
              <span className="inline-flex items-center rounded-full border border-neutral-800/80 bg-neutral-950/50 px-3 py-1 text-[11px] font-medium tabular-nums text-neutral-400">
                {formatMinutesHuman(filteredStats.totalMinutes)} total
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <QuickLogPanel />

      <section className={`${panelClass} p-4 md:p-5`}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Range
              </span>
              {rangeKey !== "all" && rangeLabel ? (
                <span className="text-[11px] font-medium text-neutral-400">
                  {rangeLabel}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className={segmentTrack}>
                {[
                  { key: "all", label: "All" },
                  { key: "today", label: "Today" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setRangeKey(r.key as RangeKey);
                      setRangeOffset(0);
                    }}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ${
                      rangeKey === r.key ? segmentActive : segmentInactive
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {rangeKey !== "all" ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRangeOffset((v) => v - 1)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-950/60 text-sm text-neutral-300 transition-colors ${accentNavHover}`}
                    aria-label="Previous period"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canGoForward) return;
                      setRangeOffset((v) => Math.min(0, v + 1));
                    }}
                    disabled={!canGoForward}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-950/60 text-sm text-neutral-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-800/80 disabled:hover:text-neutral-300 ${accentNavHover}`}
                    aria-label="Next period"
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] lg:items-end">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Search
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or notes…"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className={fieldClass}
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Sort
              </label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={fieldClass}
              >
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
                <option value="duration_desc">Duration (high)</option>
                <option value="duration_asc">Duration (low)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>
      </section>

      {editingId ? (
        <section
          className={`${panelClass} border-l-2 p-4 md:p-5 ${
            isWife ? "border-l-pink-500/60" : "border-l-amber-500/60"
          }`}
        >
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Editing
              </p>
              <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
                Edit Log
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Update title, category, times, tags, and notes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-950/50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:border-neutral-700 hover:bg-neutral-800 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className={`inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm transition-colors ${accentBtn}`}
              >
                Save
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`${fieldClass} py-2.5 text-sm`}
                placeholder="Session title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Category
              </label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))] md:items-end">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Start
              </label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                End
              </label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Tags
              </label>
              <input
                type="text"
                value={editTagsRaw}
                onChange={(e) => setEditTagsRaw(e.target.value)}
                className={fieldClass}
                placeholder="Comma separated"
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Notes
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className={fieldClass}
              placeholder="Optional"
            />
            {editError ? (
              <p className="text-xs text-red-400" role="alert">
                {editError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={`${panelClass} flex min-h-0 flex-1 flex-col`}>
        <header className="flex items-center justify-between border-b border-neutral-800/60 px-4 py-3 md:px-5">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
              Entries
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {filteredStats.count === 0
                ? "No matching records"
                : `Showing ${filteredStats.count} record${filteredStats.count === 1 ? "" : "s"}`}
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-800/80 bg-neutral-950/50 ${
                  isWife ? "text-pink-400/70" : "text-amber-400/70"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              {logs.length === 0 ? (
                <>
                  <div className="text-sm font-medium text-neutral-300">
                    No logs yet
                  </div>
                  <p className="max-w-xs text-xs leading-relaxed text-neutral-500">
                    Add a manual entry above or convert a session from the{" "}
                    <span className="text-neutral-400">Focus Timer</span>.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-neutral-300">
                    No results
                  </div>
                  <p className="max-w-xs text-xs leading-relaxed text-neutral-500">
                    Try clearing filters, adjusting the date range, or changing
                    your search.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-neutral-800/50 overflow-auto">
              {filteredLogs.map((log) => {
                const category = categories.find(
                  (c) => c.id === log.categoryId,
                );
                const start = new Date(log.startTime);
                const end = new Date(log.endTime);
                const dayNum = start.getDate();
                const monthShort = start.toLocaleDateString("en-US", {
                  month: "short",
                });
                const weekdayShort = start.toLocaleDateString("en-US", {
                  weekday: "short",
                });
                const timeLabel = `${start.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} – ${end.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`;

                return (
                  <li
                    key={log.id}
                    className="group px-4 py-3.5 transition-colors hover:bg-neutral-950/35 md:px-5"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-2 py-2 text-center">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          {weekdayShort}
                        </span>
                        <span className="text-lg font-semibold tabular-nums leading-none text-neutral-100">
                          {dayNum}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                          {monthShort}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-medium text-neutral-100">
                              {log.title}
                            </h3>
                            {log.notes ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                                {log.notes}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 rounded-full border border-neutral-800/80 bg-neutral-950/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-neutral-300">
                            {formatMinutesHuman(log.durationMinutes)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {category ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={
                                category.color
                                  ? {
                                      borderColor: category.color,
                                      backgroundColor:
                                        category.color.length === 7
                                          ? `${category.color}26`
                                          : category.color,
                                      color: category.color,
                                    }
                                  : undefined
                              }
                            >
                              {category.color ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-current"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span>{category.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-neutral-800/80 bg-neutral-950/50 px-2 py-0.5 text-[10px] text-neutral-500">
                              No category
                            </span>
                          )}
                          <span className="text-[11px] tabular-nums text-neutral-500">
                            {timeLabel}
                          </span>
                          {log.tags.length > 0
                            ? log.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex rounded-full border border-neutral-800/70 bg-neutral-950/40 px-2 py-0.5 text-[10px] text-neutral-400"
                                >
                                  {tag}
                                </span>
                              ))
                            : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1 opacity-70 transition-opacity group-hover:opacity-100 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          className="rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-neutral-500 transition-colors hover:border-neutral-800/80 hover:bg-neutral-950/60 hover:text-neutral-200"
                          onClick={() => beginEdit(log.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-red-400/90 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setDeleteCandidateId(log.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      {deleteCandidateId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border border-neutral-800/80 bg-neutral-950/95 p-5 shadow-2xl ring-1 ${accentRing}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-log-title"
          >
            <h2
              id="delete-log-title"
              className="text-sm font-semibold tracking-wide text-neutral-100"
            >
              Delete log entry?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              This action is permanent. The log will be removed from your
              history and analytics.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-900/80 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:bg-neutral-800"
                onClick={() => setDeleteCandidateId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-red-500/70 bg-red-600/90 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-50 shadow-sm transition-colors hover:bg-red-500"
                onClick={() => {
                  if (deleteCandidateId) {
                    deleteLog(deleteCandidateId);
                    setDeleteCandidateId(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

