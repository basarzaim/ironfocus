import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import type { LogEntry } from "../../../types/models";
import { useAppState } from "../../../state/AppStateProvider";
import { getBucketsForRange } from "../../../lib/analytics";

type WeeklyHoursChartProps = {
  days: number;
  logsOverride?: LogEntry[];
  endDate?: Date;
  monthMode?: boolean;
};

export function WeeklyHoursChart({
  days,
  logsOverride,
  endDate,
  monthMode,
}: WeeklyHoursChartProps) {
  const { logs: contextLogs } = useAppState();
  const logs = logsOverride ?? contextLogs;
  const data = getBucketsForRange(logs, days, endDate, monthMode === true);

  return (
    <div className="relative h-full rounded-md border border-neutral-800/80 bg-neutral-950/60 px-2 py-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={6}
            tick={{
              fill: "#9ca3af",
              fontSize: monthMode ? 9 : 11,
            }}
            tickFormatter={(value: string | number) => {
              if (!monthMode || typeof value !== "string") {
                return String(value);
              }
              const n = parseInt(value, 10);
              // Show every other day label consistently across months
              return n % 2 === 1 ? value : "";
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(250, 204, 21, 0.08)" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderRadius: 8,
              border: "1px solid #4b5563",
              padding: "4px 8px",
            }}
            labelStyle={{ color: "#e5e7eb", fontSize: 11 }}
            itemStyle={{ color: "#fbbf24", fontSize: 11 }}
            formatter={(value) => [`${Number(value ?? 0)} min`, "Minutes"]}
          />
          <Bar
            dataKey="minutes"
            fill="#fbbf24"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>

      {contextLogs.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
          Not enough data yet to display weekly hours.
        </div>
      )}

      {logsOverride && logsOverride.length === 0 && contextLogs.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
          No sessions in this range yet.
        </div>
      )}
    </div>
  );
}

