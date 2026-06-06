import { useMemo, useState } from "react";
import { StatsCards } from "../components/dashboard/StatsCards";
import { WeeklyHoursChart } from "../features/analytics/components/WeeklyHoursChart";
import { CategoryDistributionChart } from "../features/analytics/components/CategoryDistributionChart";
import { useAppState } from "../state/AppStateProvider";
import { useTheme } from "../state/ThemeProvider";
import { getCategoryDistribution, getDeepWorkMinutes } from "../lib/analytics";
import { formatMinutesHuman } from "../lib/time";

const RANGES = [
  { key: 7, label: "Week" },
  { key: 30, label: "Month" },
];

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { logs, categories } = useAppState();
  const { theme } = useTheme();
  const isWife = theme === "wife";

  const chartAnchorDate = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    if (rangeDays === 7) {
      const d = new Date(base);
      d.setDate(d.getDate() - weekOffset * 7);
      return d;
    }

    const m = new Date(base);
    m.setMonth(m.getMonth() + monthOffset, 15);
    return m;
  }, [rangeDays, weekOffset, monthOffset]);

  const chartLogs = useMemo(() => {
    if (logs.length === 0) return [];

    const end = new Date(chartAnchorDate);
    let start: Date;

    if (rangeDays === 7) {
      start = startOfWeekMonday(end);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      const year = chartAnchorDate.getFullYear();
      const month = chartAnchorDate.getMonth();
      start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return logs.filter((log) => {
      const d = new Date(log.startTime);
      return d >= start && d <= end;
    });
  }, [logs, chartAnchorDate, rangeDays]);

  const {
    totalMinutes,
    deepMinutes,
    sessionsCount,
    avgSessionMinutes,
    avgPerDayMinutes,
    deepRatio,
    topCategory,
  } = useMemo(() => {
    const total = chartLogs.reduce(
      (acc, log) => acc + log.durationMinutes,
      0,
    );
    const deep = getDeepWorkMinutes(chartLogs);
    const count = chartLogs.length;
    const windowDays =
      rangeDays === 7
        ? 7
        : chartLogs.length > 0
          ? new Date(chartAnchorDate.getFullYear(), chartAnchorDate.getMonth() + 1, 0).getDate()
          : 30;
    const avgSession = count > 0 ? Math.round(total / count) : 0;
    const avgPerDay =
      windowDays > 0 ? Math.round(total / windowDays) : 0;
    const ratio = total > 0 ? Math.round((deep / total) * 100) : 0;
    const distribution = getCategoryDistribution(chartLogs, categories);
    const top = distribution.sort((a, b) => b.minutes - a.minutes)[0];

    return {
      totalMinutes: total,
      deepMinutes: deep,
      sessionsCount: count,
      avgSessionMinutes: avgSession,
      avgPerDayMinutes: avgPerDay,
      deepRatio: ratio,
      topCategory: top,
    };
  }, [chartLogs, categories, rangeDays, chartAnchorDate]);

  const monthLabel = useMemo(() => {
    if (rangeDays !== 30) return "";
    return chartAnchorDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [rangeDays, chartAnchorDate]);

  const todayLogs = useMemo(() => {
    if (logs.length === 0) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return logs.filter((log) => {
      const d = new Date(log.startTime);
      return d >= today && d <= end;
    });
  }, [logs]);

  const weekLabel = useMemo(() => {
    if (rangeDays !== 7) return "";
    const end = new Date(chartAnchorDate);
    const start = startOfWeekMonday(end);
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startLabel = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endLabel = weekEnd.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }, [rangeDays, chartAnchorDate]);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
            Analytics
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Hours, categories, and deep work over time.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="uppercase tracking-[0.18em] text-neutral-500">
            Range
          </span>
          <div className="inline-flex rounded-full border border-neutral-700 bg-neutral-950/40 p-[2px]">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeDays(r.key)}
                className={`rounded-full px-3 py-1 text-[11px] ${
                  rangeDays === r.key
                    ? "bg-neutral-200 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <StatsCards
        todayLogsOverride={todayLogs}
        periodLogsOverride={chartLogs}
        periodLabel={rangeDays === 30 ? "This month" : "This week"}
      />

      <section className="zs-panel border border-neutral-800 bg-neutral-900/80 p-4">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
              Focus Summary
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {rangeDays === 7 ? `Selected week • ${weekLabel}` : monthLabel || "Selected month"}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <div>Total: {formatMinutesHuman(totalMinutes)}</div>
            <div className="mt-0.5">Deep work: {formatMinutesHuman(deepMinutes)}</div>
          </div>
        </header>
        <div className="mt-2 grid gap-3 text-xs text-neutral-300 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-800/80 bg-neutral-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Sessions
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-50">
              {sessionsCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Total entries in this window
            </div>
          </div>
          <div className="rounded-md border border-neutral-800/80 bg-neutral-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Avg session
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-50">
              {formatMinutesHuman(avgSessionMinutes)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Per completed session
            </div>
          </div>
          <div className="rounded-md border border-neutral-800/80 bg-neutral-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Avg per day
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-50">
              {formatMinutesHuman(avgPerDayMinutes)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Based on selected range
            </div>
          </div>
          <div className="rounded-md border border-neutral-800/80 bg-neutral-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Deep work ratio
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-50">
              {deepMinutes === 0 && totalMinutes === 0
                ? "—"
                : `${deepRatio}%`}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              {formatMinutesHuman(deepMinutes)} of{" "}
              {formatMinutesHuman(totalMinutes)}
            </div>
          </div>
          <div className="rounded-md border border-neutral-800/80 bg-neutral-950/60 px-3 py-2 sm:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Most focused category
            </div>
            {topCategory ? (
              <>
                <div className="mt-1 text-sm font-semibold text-neutral-50">
                  {topCategory.name}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {formatMinutesHuman(topCategory.minutes)} in this window
                </div>
              </>
            ) : (
              <div className="mt-1 text-[11px] text-neutral-500">
                Not enough data yet to determine a top category.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="zs-panel flex h-[420px] flex-col border border-neutral-800 bg-neutral-900/80 p-4">
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
              Hours by Day
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="uppercase tracking-[0.18em]">
                {rangeDays === 7 ? `Week • ${weekLabel}` : monthLabel}
              </span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className={`h-6 w-6 rounded-full border border-neutral-700 text-neutral-400 ${
                    isWife
                      ? "hover:border-pink-500 hover:text-pink-300"
                      : "hover:border-amber-500 hover:text-amber-300"
                  }`}
                  onClick={() =>
                    rangeDays === 7
                      ? setWeekOffset((v) => v + 1)
                      : setMonthOffset((v) => v - 1)
                  }
                  aria-label="Previous period"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`h-6 w-6 rounded-full border border-neutral-700 text-neutral-400 disabled:opacity-40 ${
                    isWife
                      ? "hover:border-pink-500 hover:text-pink-300"
                      : "hover:border-amber-500 hover:text-amber-300"
                  }`}
                  onClick={() =>
                    rangeDays === 7
                      ? setWeekOffset((v) => Math.max(0, v - 1))
                      : setMonthOffset((v) => Math.min(0, v + 1))
                  }
                  disabled={rangeDays === 7 ? weekOffset === 0 : monthOffset === 0}
                  aria-label="Next period"
                >
                  ›
                </button>
              </div>
            </div>
          </header>
          <div className="mt-1 flex-1">
            <WeeklyHoursChart
              days={rangeDays === 7 ? 7 : 30}
              logsOverride={chartLogs}
              endDate={chartAnchorDate}
              monthMode={rangeDays === 30}
              weekMode={rangeDays === 7}
            />
          </div>
        </section>

        <section className="zs-panel flex h-[420px] flex-col border border-neutral-800 bg-neutral-900/80 p-4">
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
              Category Distribution
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="uppercase tracking-[0.18em]">
                {rangeDays === 7 ? `Week • ${weekLabel}` : monthLabel}
              </span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className={`h-6 w-6 rounded-full border border-neutral-700 text-neutral-400 ${
                    isWife
                      ? "hover:border-pink-500 hover:text-pink-300"
                      : "hover:border-amber-500 hover:text-amber-300"
                  }`}
                  onClick={() =>
                    rangeDays === 7
                      ? setWeekOffset((v) => v + 1)
                      : setMonthOffset((v) => v - 1)
                  }
                  aria-label="Previous period"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={`h-6 w-6 rounded-full border border-neutral-700 text-neutral-400 disabled:opacity-40 ${
                    isWife
                      ? "hover:border-pink-500 hover:text-pink-300"
                      : "hover:border-amber-500 hover:text-amber-300"
                  }`}
                  onClick={() =>
                    rangeDays === 7
                      ? setWeekOffset((v) => Math.max(0, v - 1))
                      : setMonthOffset((v) => Math.min(0, v + 1))
                  }
                  disabled={rangeDays === 7 ? weekOffset === 0 : monthOffset === 0}
                  aria-label="Next period"
                >
                  ›
                </button>
              </div>
            </div>
          </header>
          <div className="mt-1 flex-1">
            <CategoryDistributionChart logsOverride={chartLogs} />
          </div>
        </section>
      </div>
    </div>
  );
}

