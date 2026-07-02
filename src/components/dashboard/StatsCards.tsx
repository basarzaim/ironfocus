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

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  accent?: "today" | "period" | "deep";
};

function StatCard({ label, value, hint, accent }: StatCardProps) {
  const accentBar =
    accent === "today"
      ? "from-[rgb(var(--if-accent-rgb)/80%)] to-[rgb(var(--if-accent-rgb)/0%)]"
      : accent === "deep"
        ? "from-[rgb(var(--if-accent-light-rgb)/60%)] to-[rgb(var(--if-accent-light-rgb)/0%)]"
        : "from-neutral-500/50 to-neutral-500/0";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 p-4 ring-1 ring-white/[0.03] transition-colors hover:border-neutral-700/80">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentBar}`}
        aria-hidden
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-neutral-50">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

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
      <StatCard
        label="Today"
        value={formatMinutesHuman(todayMinutes)}
        hint="Focused work so far"
        accent="today"
      />
      <StatCard
        label={periodTitle}
        value={formatMinutesHuman(periodMinutes)}
        hint="All categories in range"
        accent="period"
      />
      <StatCard
        label="Deep work"
        value={formatMinutesHuman(deepMinutes)}
        hint="Sessions ≥ 60 minutes"
        accent="deep"
      />
    </section>
  );
}
