import { useState } from "react";
import { useAppState } from "../state/AppStateProvider";
import { formatMinutesHuman } from "../lib/time";
import { QuickLogPanel } from "../components/dashboard/QuickLogPanel";

type SortKey = "date_desc" | "date_asc" | "duration_desc" | "duration_asc";
type RangeKey = "all" | "today" | "week" | "month";

export function LogsPage() {
  const { logs, categories, deleteLog, updateLogFromForm } = useAppState();
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

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
            Logs
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            All recorded focus sessions and manual entries.
          </p>
        </div>
      </header>

      <QuickLogPanel />

      <section className="zs-panel flex-0 border border-neutral-800 bg-neutral-900/80 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:items-end">
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
                    Range
                  </span>
                  {rangeKey !== "all" && rangeLabel && (
                    <span className="text-[11px] font-medium text-neutral-400">
                      {rangeLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-neutral-300">
                  <div className="inline-flex rounded-full border border-neutral-700 bg-neutral-950/60 p-[2px]">
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
                        className={`rounded-full px-3 py-1.5 text-[12px] ${
                          rangeKey === r.key
                            ? "bg-neutral-200 text-neutral-900"
                            : "text-neutral-400 hover:text-neutral-50"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {rangeKey !== "all" && (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRangeOffset((v) => v - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950/80 text-sm text-neutral-200 hover:border-amber-500 hover:text-amber-300"
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
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950/80 text-sm text-neutral-200 hover:border-amber-500 hover:text-amber-300 ${
                          !canGoForward
                            ? "cursor-not-allowed opacity-40 hover:border-neutral-700 hover:text-neutral-200"
                            : ""
                        }`}
                        aria-label="Next period"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                Search
              </label>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or notes…"
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                Sort
              </label>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              >
                <option value="date_desc">Date (newest)</option>
                <option value="date_asc">Date (oldest)</option>
                <option value="duration_desc">Duration (high)</option>
                <option value="duration_asc">Duration (low)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-[7px] text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-[7px] text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              />
            </div>
          </div>
        </div>
      </section>

      {editingId ? (
        <section className="zs-panel border border-neutral-800 bg-neutral-900/80 p-4">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
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
                className="inline-flex items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="inline-flex items-center justify-center rounded-md border border-amber-500/60 bg-amber-600/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-950 shadow-sm transition-colors hover:bg-amber-500"
              >
                Save
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
                placeholder="Session title"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                Category
              </label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
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
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                Start
              </label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                End
              </label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-medium text-neutral-400">
                Tags
              </label>
              <input
                type="text"
                value={editTagsRaw}
                onChange={(e) => setEditTagsRaw(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
                placeholder="Comma separated"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              Notes
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
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

      <section className="zs-panel flex-1 overflow-hidden border border-neutral-800 bg-neutral-900/80">
        <div className="flex h-full flex-col">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-xs text-neutral-500">
              {logs.length === 0 ? (
                <>
                  <div className="text-neutral-400">No logs yet.</div>
                  <div>
                    Add a manual entry above or convert a session from the{" "}
                    <span className="text-neutral-300">Focus Timer</span>.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-neutral-400">No results.</div>
                  <div>Try clearing filters, adjusting the date range, or changing your search.</div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="min-w-full border-separate border-spacing-y-1 px-2 text-xs">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  <tr>
                    <th className="px-2 py-1 text-left font-normal">Title</th>
                    <th className="px-2 py-1 text-left font-normal">Category</th>
                    <th className="px-2 py-1 text-left font-normal">Date</th>
                    <th className="px-2 py-1 text-left font-normal">
                      Start–End
                    </th>
                    <th className="px-2 py-1 text-left font-normal">Duration</th>
                    <th className="px-2 py-1 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const category = categories.find(
                      (c) => c.id === log.categoryId,
                    );
                    const start = new Date(log.startTime);
                    const end = new Date(log.endTime);
                    const dateLabel = start.toLocaleDateString("en-US");
                    const timeLabel = `${start.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} – ${end.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`;

                    return (
                      <tr key={log.id}>
                        <td className="px-2 py-1">
                          <div className="font-medium text-neutral-100">
                            {log.title}
                          </div>
                          {log.notes ? (
                            <div className="mt-0.5 text-[11px] text-neutral-500">
                              {log.notes}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1">
                          {category ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-medium uppercase tracking-[0.18em]"
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
                                  className="h-2 w-2 rounded-full bg-current"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span>{category.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-neutral-700 bg-neutral-900 px-2 py-[2px] text-[11px] text-neutral-300">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-neutral-300">
                          {dateLabel}
                        </td>
                        <td className="px-2 py-1 text-neutral-300">
                          {timeLabel}
                        </td>
                        <td className="px-2 py-1 text-neutral-300">
                          {formatMinutesHuman(log.durationMinutes)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            className="mr-3 text-[11px] text-neutral-500 hover:text-neutral-300"
                            onClick={() => beginEdit(log.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-red-400 hover:text-red-300"
                            onClick={() => {
                              // eslint-disable-next-line no-alert
                              if (
                                window.confirm(
                                  "Delete this log entry? This cannot be undone.",
                                )
                              ) {
                                deleteLog(log.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

