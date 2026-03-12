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
import type { LogEntry } from "../../../types/models";
import { getCategoryDistribution } from "../../../lib/analytics";

const FALLBACK_COLORS = ["#fbbf24", "#f97316", "#22d3ee", "#a855f7", "#4ade80"];

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
  const logs = logsOverride ?? contextLogs;
  const data = getCategoryDistribution(logs, categories);

  const withColors = data.map((d, index) => ({
    ...d,
    color:
      d.color && d.color.trim().length > 0
        ? d.color
        : FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <div className="flex h-full flex-col rounded-md border border-neutral-800/80 bg-neutral-950/60 px-2 py-1">
      <div className="mb-1 flex justify-end gap-1 pr-1 pt-1 text-[10px] text-neutral-500">
        <button
          type="button"
          onClick={() => setVariant("pie")}
          className={`rounded-full px-2 py-0.5 uppercase tracking-[0.16em] ${
            variant === "pie"
              ? "bg-neutral-200 text-neutral-900"
              : "bg-transparent text-neutral-500 hover:text-neutral-200"
          }`}
        >
          Pie
        </button>
        <button
          type="button"
          onClick={() => setVariant("bars")}
          className={`rounded-full px-2 py-0.5 uppercase tracking-[0.16em] ${
            variant === "bars"
              ? "bg-neutral-200 text-neutral-900"
              : "bg-transparent text-neutral-500 hover:text-neutral-200"
          }`}
        >
          Bars
        </button>
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
                      fill: "#9ca3af",
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
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
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
                      fill: "#9ca3af",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: "#9ca3af",
                      fontSize: 11,
                      textAnchor: "start",
                      dx: -8,
                    }}
                  />
                </>
              )}
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
                  <Cell key={entry.categoryId} fill={entry.color} stroke="#020617" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderRadius: 8,
                  border: "1px solid #4b5563",
                  padding: "4px 8px",
                }}
                labelStyle={{ color: "#e5e7eb", fontSize: 11 }}
                itemStyle={{ color: "#e5e7eb", fontSize: 11 }}
                formatter={(value, _name, item) => [
                  `${Number(value ?? 0)} min`,
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
            className="absolute left-0 top-0 -translate-y-6  inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-[11px] text-neutral-300 shadow-sm hover:border-amber-500 hover:text-amber-300"
            title="Toggle bar orientation"
          >
            <span className="leading-none">⇆</span>
          </button>
        )}
      </div>
    </div>
  );
}

