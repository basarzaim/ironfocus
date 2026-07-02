import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { useAppState } from "../../../state/AppStateProvider";
import { useTheme } from "../../../state/ThemeProvider";
import type { LogEntry } from "../../../types/models";
import { getCategoryDistribution } from "../../../lib/analytics";
import { formatMinutesHuman } from "../../../lib/time";
import { getCssAccentColor } from "../../../lib/accentColor";

const FALLBACK_COLORS = ["#ec4899", "#f97316", "#22d3ee", "#a855f7", "#4ade80"];

function accentAlpha(color: string, alpha: number): string {
  return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}

type CategoryDistributionChartProps = {
  logsOverride?: LogEntry[];
};

export function CategoryDistributionChart({
  logsOverride,
}: CategoryDistributionChartProps) {
  const [variant, setVariant] = useState<"pie" | "bars">("pie");
  const [barLayout, setBarLayout] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const { logs: contextLogs, categories } = useAppState();
  const { colorMode } = useTheme();
  const isLight = colorMode === "light";

  const tickColor = isLight ? "#4a4a56" : "#9ca3af";
  const tooltipBg = isLight ? "#f0f1f4" : "#020617";
  const tooltipBorder = isLight ? "rgba(0,0,0,0.14)" : "#4b5563";
  const tooltipLabel = isLight ? "#17171a" : "#e5e7eb";
  const tooltipItem = getCssAccentColor(isLight ? "if-accent-strong" : "if-accent-muted");
  const pieStroke = isLight ? "#e8eaee" : "#020617";
  const cursorFill = accentAlpha(getCssAccentColor("if-accent-strong"), 0.08);
  const barToggleHover =
    "hover:border-[rgb(var(--if-accent-rgb))] hover:text-[rgb(var(--if-accent-light-rgb))]";
  const logs = logsOverride ?? contextLogs;
  const data = getCategoryDistribution(logs, categories);

  const withColors = data.map((d, index) => ({
    ...d,
    color:
      d.color && d.color.trim().length > 0
        ? d.color
        : FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  const segmentActive =
    "bg-[rgb(var(--if-accent-rgb)/15%)] text-[rgb(var(--if-accent-light-rgb))] ring-1 ring-[rgb(var(--if-accent-rgb)/30%)]";

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-800/70 bg-neutral-950/50 px-2 py-2 ring-1 ring-white/[0.02]">
      <div className="mb-2 flex justify-end gap-1 pr-1 pt-0.5">
        <div className="inline-flex rounded-full border border-neutral-800/80 bg-neutral-950/40 p-0.5 text-[10px] text-neutral-500">
          <button
            type="button"
            onClick={() => setVariant("pie")}
            className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] transition-all ${
              variant === "pie"
                ? segmentActive
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Pie
          </button>
          <button
            type="button"
            onClick={() => setVariant("bars")}
            className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] transition-all ${
              variant === "bars"
                ? segmentActive
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Bars
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "bars" ? (
            <BarChart
              data={withColors}
              layout={barLayout}
              margin={
                barLayout === "vertical"
                  ? { top: 10, right: 15, left: -15, bottom: -8 }
                  : { top: 10, right: 15, left: -15, bottom: -8 }
              }
              barCategoryGap={8}
              barGap={4}
            >
              {barLayout === "vertical" ? (
                <>
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: tickColor,
                      fontSize: 11,
                      textAnchor: "start",
                      dx: -8,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: tickColor, fontSize: 11 }}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tickMargin={4}
                    tick={{
                      fill: tickColor,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: tickColor,
                      fontSize: 11,
                      textAnchor: "start",
                      dx: -8,
                    }}
                  />
                </>
              )}
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
              <Bar dataKey="minutes" radius={[4, 4, 4, 4]}>
                {withColors.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={withColors}
                dataKey="minutes"
                nameKey="name"
                innerRadius={0}
                outerRadius="80%"
                paddingAngle={2}
              >
                {withColors.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} stroke={pieStroke} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderRadius: 8,
                  border: `1px solid ${tooltipBorder}`,
                  padding: "4px 8px",
                }}
                labelStyle={{ color: tooltipLabel, fontSize: 11 }}
                itemStyle={{ color: tooltipLabel, fontSize: 11 }}
                formatter={(value, _name, item) => [
                  formatMinutesHuman(Number(value ?? 0)),
                  (item?.payload as { name: string } | undefined)?.name ?? "Category",
                ]}
              />
            </PieChart>
          )}
        </ResponsiveContainer>

        {contextLogs.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
            Not enough data yet to show category distribution.
          </div>
        )}

        {logsOverride && logsOverride.length === 0 && contextLogs.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-neutral-500">
            No category data in this range yet.
          </div>
        )}

        {variant === "bars" && (
          <button
            type="button"
            onClick={() =>
              setBarLayout((prev) =>
                prev === "vertical" ? "horizontal" : "vertical",
              )
            }
            className={`absolute left-0 top-0 -translate-y-6 inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-[11px] text-neutral-300 shadow-sm ${barToggleHover}`}
            title="Toggle bar orientation"
          >
            <span className="leading-none">⇆</span>
          </button>
        )}
      </div>
    </div>
  );
}

