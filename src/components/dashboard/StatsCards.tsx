import { useAppState } from "../../state/AppStateProvider";
import type { LogEntry } from "../../types/models";
import { getStatsSummary } from "../../lib/analytics";

type StatsCardsProps = {
  logsOverride?: LogEntry[];
};

export function StatsCards({ logsOverride }: StatsCardsProps) {
  const { logs: contextLogs } = useAppState();
  const logs = logsOverride ?? contextLogs;
  const stats = getStatsSummary(logs);

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Today
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {stats.todayLabel}
        </div>
        <div className="mt-1 text-xs text-neutral-500">Focused work</div>
      </div>

      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Last 7 days
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {stats.last7Label}
        </div>
        <div className="mt-1 text-xs text-neutral-500">All categories</div>
      </div>

      <div className="zs-panel border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Deep work
        </div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">
          {stats.deepLabel}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Sessions ≥ 60 minutes
        </div>
      </div>
    </section>
  );
}

