import { QuickLogPanel } from "../components/dashboard/QuickLogPanel";
import { TimerPanel } from "../components/dashboard/TimerPanel";
import { TodayLogsList } from "../components/dashboard/TodayLogsList";
import { StatsCards } from "../components/dashboard/StatsCards";
import { WeeklyHoursChart } from "../features/analytics/components/WeeklyHoursChart";
import { CategoryDistributionChart } from "../features/analytics/components/CategoryDistributionChart";

export function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
            Dashboard
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Structured overview of today&apos;s focus work.
          </p>
        </div>
        <div className="hidden text-[11px] uppercase tracking-[0.18em] text-neutral-600 md:block">
          IronFocus • Focus Console
        </div>
      </header>

      <div className="grid flex-1 grid-rows-[auto_auto_1fr] gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)] lg:grid-rows-1">
        <div className="flex flex-col gap-4 lg:overflow-hidden">
          <TimerPanel />
          <QuickLogPanel />
          <div className="flex-1 min-h-0">
            <TodayLogsList />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <StatsCards />

          <section className="zs-panel h-52 border border-neutral-800 bg-neutral-900/80 p-4">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
                Weekly Hours
              </h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Last 7 days
              </span>
            </header>
            <div className="mt-1 h-32">
              <WeeklyHoursChart days={7} />
            </div>
          </section>

          <section className="zs-panel h-64 border border-neutral-800 bg-neutral-900/80 p-4">
            <header className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
                Category Distribution
              </h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Focus time split
              </span>
            </header>
            <div className="mt-1 h-44">
              <CategoryDistributionChart />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

