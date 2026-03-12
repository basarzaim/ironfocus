import { useAppState } from "../../state/AppStateProvider";
import { formatMinutesHuman, isSameDay } from "../../lib/time";

export function TodayLogsList() {
  const { logs, categories } = useAppState();
  const today = new Date();
  const todaysLogs = logs.filter((log) =>
    isSameDay(new Date(log.startTime), today),
  );

  const countLabel =
    todaysLogs.length === 0
      ? "No entries yet"
      : `${todaysLogs.length} entr${todaysLogs.length === 1 ? "y" : "ies"}`;

  return (
    <section className="zs-panel flex min-h-[200px] flex-col border border-neutral-800 bg-neutral-900/80 p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
            Today&apos;s Logs
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Manual entries and finished focus blocks
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          {countLabel}
        </span>
      </header>

      <div className="-mx-2 flex-1 overflow-auto px-2 pt-1">
        {todaysLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-neutral-800/80 text-xs text-neutral-500">
            <div>No logs for today yet.</div>
            <div className="mt-1 text-[11px]">
              Use Quick Log or finish a focus block to see entries here.
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800/80">
            {todaysLogs.map((log) => {
              const category = categories.find((c) => c.id === log.categoryId);
              const start = new Date(log.startTime);
              const end = new Date(log.endTime);
              const startLabel = start.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const endLabel = end.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const categoryStyle =
                category && category.color
                  ? {
                      borderColor: category.color,
                      backgroundColor:
                        category.color.length === 7
                          ? `${category.color}26`
                          : category.color,
                      color: category.color,
                    }
                  : undefined;

              return (
                <li key={log.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-neutral-100">
                          {log.title}
                        </h3>
                      </div>
                      {log.notes ? (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                          {log.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-xs text-neutral-400">
                      <div className="flex items-center justify-end gap-2 tabular-nums">
                        {category ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.18em]"
                            style={categoryStyle}
                          >
                            <span
                              className="h-2 w-2 rounded-full bg-current"
                              aria-hidden="true"
                            />
                            <span>{category.name}</span>
                          </span>
                        ) : null}
                        <span>
                          {startLabel} – {endLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        {formatMinutesHuman(log.durationMinutes)}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

