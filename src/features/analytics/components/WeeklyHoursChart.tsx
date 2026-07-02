import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import type { LogEntry } from "../../../types/models";
import { useAppState } from "../../../state/AppStateProvider";
import { useTheme } from "../../../state/ThemeProvider";
import { getBucketsForRange } from "../../../lib/analytics";
import { formatMinutesHuman } from "../../../lib/time";
import { getCssAccentColor } from "../../../lib/accentColor";

function accentAlpha(color: string, alpha: number): string {
  return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}

type WeeklyHoursChartProps = {
  days: number;
  logsOverride?: LogEntry[];
  endDate?: Date;
  monthMode?: boolean;
  weekMode?: boolean;
};

export function WeeklyHoursChart({
  days,
  logsOverride,
  endDate,
  monthMode,
  weekMode,
}: WeeklyHoursChartProps) {
  const { logs: contextLogs } = useAppState();
  const logs = logsOverride ?? contextLogs;
  const data = getBucketsForRange(
    logs,
    days,
    endDate,
    monthMode === true,
    weekMode === true,
  );
  const { colorMode } = useTheme();
  const isLight = colorMode === "light";

  const tickColor = isLight ? "#4a4a56" : "#9ca3af";
  const tooltipBg = isLight ? "#f0f1f4" : "#020617";
  const tooltipBorder = isLight ? "rgba(0,0,0,0.14)" : "#4b5563";
  const tooltipLabel = isLight ? "#17171a" : "#e5e7eb";
  const tooltipItem = getCssAccentColor(isLight ? "if-accent-strong" : "if-accent-muted");
  const barFill = tooltipItem;
  const cursorFill = accentAlpha(getCssAccentColor("if-accent"), 0.08);

  return (
    <div className="relative h-full rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-2 py-2 ring-1 ring-white/[0.02]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tickMargin={6}
            tick={{
              fill: tickColor,
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
            cursor={{
              fill: cursorFill,
            }}
            contentStyle={{
              backgroundColor: tooltipBg,
              borderRadius: 8,
              border: `1px solid ${tooltipBorder}`,
              padding: "4px 8px",
            }}
            labelStyle={{ color: tooltipLabel, fontSize: 11 }}
            itemStyle={{
              color: tooltipItem,
              fontSize: 11,
            }}
            formatter={(value) => [formatMinutesHuman(Number(value ?? 0)), "Time"]}
          />
          <Bar
            dataKey="minutes"
            fill={barFill}
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

