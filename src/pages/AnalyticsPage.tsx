import { useMemo, useState, type ReactNode } from "react";
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

const panelClass =
  "zs-panel overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 ring-1 ring-white/[0.03]";

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

type PeriodNavProps = {
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isRose: boolean;
};

function PeriodNav({ onPrev, onNext, canGoNext, isRose }: PeriodNavProps) {
  const navHover = isRose
    ? "hover:border-pink-500/50 hover:text-pink-300"
    : "hover:border-amber-500/50 hover:text-amber-400";

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-950/60 text-sm text-neutral-300 transition-colors ${navHover}`}
        onClick={onPrev}
        aria-label="Previous period"
      >
        ‹
      </button>
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800/80 bg-neutral-950/60 text-sm text-neutral-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-800/80 disabled:hover:text-neutral-300 ${navHover}`}
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next period"
      >
        ›
      </button>
    </div>
  );
}

type SummaryStatProps = {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  className?: string;
};

function SummaryStat({ label, value, hint, className = "" }: SummaryStatProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-4 py-3 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <div className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-neutral-50">
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">
        {hint}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const { logs, categories } = useAppState();
  const { theme } = useTheme();
  const isRose = theme === "rose";

  const segmentTrack =
    "inline-flex items-center gap-0.5 rounded-full border border-neutral-800/80 bg-neutral-950/50 p-1 backdrop-blur-sm";
  const segmentActive = isRose
    ? "bg-pink-500 text-white shadow-sm shadow-pink-950/30 ring-1 ring-pink-400/30"
    : "bg-amber-500 text-neutral-950 shadow-sm shadow-amber-950/30 ring-1 ring-amber-400/40";
  const segmentInactive =
    "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-200";

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
          ? new Date(
              chartAnchorDate.getFullYear(),
              chartAnchorDate.getMonth() + 1,
              0,
            ).getDate()
          : 30;
    const avgSession = count > 0 ? Math.round(total / count) : 0;
    const avgPerDay = windowDays > 0 ? Math.round(total / windowDays) : 0;
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

  const periodLabel = rangeDays === 7 ? weekLabel : monthLabel;
  const canGoNextPeriod =
    rangeDays === 7 ? weekOffset > 0 : monthOffset < 0;

  function handlePrevPeriod() {
    if (rangeDays === 7) setWeekOffset((v) => v + 1);
    else setMonthOffset((v) => v - 1);
  }

  function handleNextPeriod() {
    if (rangeDays === 7) setWeekOffset((v) => Math.max(0, v - 1));
    else setMonthOffset((v) => Math.min(0, v + 1));
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 px-5 py-4 ring-1 ring-white/[0.03]">
        <div
          className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
            isRose ? "bg-pink-500/10" : "bg-amber-500/10"
          }`}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Performance
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-50">
              Analytics
            </h1>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
              Hours, categories, and deep work over time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`hidden text-[11px] font-medium tabular-nums sm:inline ${
                isRose ? "text-pink-300/80" : "text-amber-300/80"
              }`}
            >
              {formatMinutesHuman(totalMinutes)} in range
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Range
              </span>
              <div className={segmentTrack}>
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRangeDays(r.key)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ${
                      rangeDays === r.key ? segmentActive : segmentInactive
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <StatsCards
        todayLogsOverride={todayLogs}
        periodLogsOverride={chartLogs}
        periodLabel={rangeDays === 30 ? "This month" : "This week"}
      />

      <section className={`${panelClass} p-4 md:p-5`}>
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Breakdown
            </p>
            <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
              Focus summary
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {rangeDays === 7
                ? `Selected week · ${weekLabel}`
                : monthLabel || "Selected month"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-right text-xs">
            <span className="rounded-full border border-neutral-800/80 bg-neutral-950/50 px-3 py-1 tabular-nums text-neutral-400">
              Total {formatMinutesHuman(totalMinutes)}
            </span>
            <span
              className={`rounded-full border border-neutral-800/80 px-3 py-1 tabular-nums ${
                isRose
                  ? "bg-pink-500/10 text-pink-300/90"
                  : "bg-amber-500/10 text-amber-300/90"
              }`}
            >
              Deep {formatMinutesHuman(deepMinutes)}
            </span>
          </div>
        </header>

        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <SummaryStat
            label="Sessions"
            value={sessionsCount}
            hint="Total entries in this window"
          />
          <SummaryStat
            label="Avg session"
            value={formatMinutesHuman(avgSessionMinutes)}
            hint="Per completed session"
          />
          <SummaryStat
            label="Avg per day"
            value={formatMinutesHuman(avgPerDayMinutes)}
            hint="Based on selected range"
          />
          <SummaryStat
            label="Deep work ratio"
            value={
              deepMinutes === 0 && totalMinutes === 0 ? "—" : `${deepRatio}%`
            }
            hint={
              <>
                {formatMinutesHuman(deepMinutes)} of{" "}
                {formatMinutesHuman(totalMinutes)}
              </>
            }
          />
          <SummaryStat
            label="Top category"
            className="sm:col-span-2 lg:col-span-2"
            value={
              topCategory ? (
                <span className="flex items-center gap-2">
                  {topCategory.color ? (
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: topCategory.color }}
                      aria-hidden
                    />
                  ) : null}
                  {topCategory.name}
                </span>
              ) : (
                "—"
              )
            }
            hint={
              topCategory
                ? `${formatMinutesHuman(topCategory.minutes)} in this window`
                : "Not enough data yet to determine a top category."
            }
          />
        </div>
      </section>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={`${panelClass} flex h-[440px] flex-col p-4 md:p-5`}>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Daily rhythm
              </p>
              <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
                Hours by day
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 sm:inline">
                {rangeDays === 7 ? weekLabel : monthLabel}
              </span>
              <PeriodNav
                onPrev={handlePrevPeriod}
                onNext={handleNextPeriod}
                canGoNext={canGoNextPeriod}
                isRose={isRose}
              />
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <WeeklyHoursChart
              days={rangeDays === 7 ? 7 : 30}
              logsOverride={chartLogs}
              endDate={chartAnchorDate}
              monthMode={rangeDays === 30}
              weekMode={rangeDays === 7}
            />
          </div>
        </section>

        <section className={`${panelClass} flex h-[440px] flex-col p-4 md:p-5`}>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Distribution
              </p>
              <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
                By category
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 sm:inline">
                {periodLabel}
              </span>
              <PeriodNav
                onPrev={handlePrevPeriod}
                onNext={handleNextPeriod}
                canGoNext={canGoNextPeriod}
                isRose={isRose}
              />
            </div>
          </header>
          <div className="min-h-0 flex-1">
            <CategoryDistributionChart logsOverride={chartLogs} />
          </div>
        </section>
      </div>
    </div>
  );
}
