import { useMemo } from "react";
import { useAppState } from "../../state/AppStateProvider";
import type { LogEntry } from "../../types/models";
import { getDeepWorkMinutes, getTodayTotalMinutes } from "../../lib/analytics";
import { formatMinutesHuman } from "../../lib/time";

type StatsCardsProps = {
  todayLogsOverride?: LogEntry[];
  periodLogsOverride?: LogEntry[];
  periodLabel?: string;
};

export function StatsCards({
  todayLogsOverride,
  periodLogsOverride,
  periodLabel,
}: StatsCardsProps) {
  const { logs: contextLogs } = useAppState();
  const todayMinutes = useMemo(() => {
    return getTodayTotalMinutes(todayLogsOverride ?? contextLogs);
  }, [todayLogsOverride, contextLogs]);

  const periodMinutes = useMemo(() => {
    const scope = periodLogsOverride ?? contextLogs;
    return scope.reduce((acc, log) => acc + log.durationMinutes, 0);
  }, [periodLogsOverride, contextLogs]);

  const deepMinutes = useMemo(() => {
    return getDeepWorkMinutes(periodLogsOverride ?? contextLogs);
  }, [periodLogsOverride, contextLogs]);

  const periodTitle = periodLabel ?? "This week";

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Today
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {formatMinutesHuman(todayMinutes)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">Focused work</div>
      </div>

      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          {periodTitle}
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {formatMinutesHuman(periodMinutes)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">All categories</div>
      </div>

      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Deep work
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {formatMinutesHuman(deepMinutes)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Sessions ≥ 60 minutes
        </div>
      </div>
    </section>
  );
}

