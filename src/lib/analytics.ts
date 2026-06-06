import type { Category, LogEntry } from "../types/models";
import { formatMinutesHuman, isSameDay, isWithinLastDays } from "./time";

function filterLogsWithinDays(logs: LogEntry[], days: number): LogEntry[] {
  return logs.filter((log) => isWithinLastDays(new Date(log.startTime), days));
}

function toLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // Sun=0..Sat=6
  const diff = (day + 6) % 7; // Mon(1)->0 ... Sun(0)->6
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeekSunday(ref: Date): Date {
  const start = startOfWeekMonday(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getTodayTotalMinutes(logs: LogEntry[]): number {
  const today = new Date();
  return logs
    .filter((log) => isSameDay(new Date(log.startTime), today))
    .reduce((acc, log) => acc + log.durationMinutes, 0);
}

export function getRangeTotalMinutes(logs: LogEntry[], days: number): number {
  return filterLogsWithinDays(logs, days).reduce(
    (acc, log) => acc + log.durationMinutes,
    0,
  );
}

// Deep work: sessions >= 60 minutes for now.
export function getDeepWorkMinutes(logs: LogEntry[], days?: number): number {
  const scope = typeof days === "number" ? filterLogsWithinDays(logs, days) : logs;
  return scope
    .filter((log) => log.durationMinutes >= 60)
    .reduce((acc, log) => acc + log.durationMinutes, 0);
}

export function getStatsSummary(logs: LogEntry[]) {
  const todayMinutes = getTodayTotalMinutes(logs);
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = endOfWeekSunday(now);
  const weekLogs = logs.filter((log) => {
    const d = new Date(log.startTime);
    return d >= weekStart && d <= weekEnd;
  });
  const weekMinutes = weekLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
  const deepMinutes = weekLogs
    .filter((log) => log.durationMinutes >= 60)
    .reduce((acc, log) => acc + log.durationMinutes, 0);

  return {
    todayLabel: formatMinutesHuman(todayMinutes),
    last7Label: formatMinutesHuman(weekMinutes),
    deepLabel: formatMinutesHuman(deepMinutes),
  };
}

export function getBucketsForRange(
  logs: LogEntry[],
  days: number,
  endDate?: Date,
  monthMode = false,
  weekMode = false,
) {
  const ref = endDate ? new Date(endDate) : new Date();

  let start: Date;
  let end: Date;

  if (monthMode) {
    const year = ref.getFullYear();
    const month = ref.getMonth();
    start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else if (weekMode) {
    start = startOfWeekMonday(ref);
    end = endOfWeekSunday(ref);
  } else {
    end = new Date(ref);
    end.setHours(23, 59, 59, 999);
    start = new Date(ref);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
  }

  const buckets: {
    date: string;
    label: string;
    minutes: number;
    weekday?: number;
  }[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    const label = monthMode
      ? String(cursor.getDate())
      : weekMode || days <= 7
        ? cursor.toLocaleDateString("en-US", {
            weekday: "short",
          })
        : cursor.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
    const dateKey = toLocalDateKey(cursor);
    buckets.push({
      date: dateKey,
      label,
      minutes: 0,
      weekday: cursor.getDay(),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  logs.forEach((log) => {
    const d = new Date(log.startTime);
    if (d < start || d > end) return;
    const key = toLocalDateKey(d);
    const bucket = buckets.find((b) => b.date === key);
    if (bucket) bucket.minutes += log.durationMinutes;
  });

  // For rolling 7-day windows we sort to show Monday first.
  // For calendar weeks we already generate Monday → Sunday order.
  if (!monthMode && !weekMode && days === 7) {
    buckets.sort((a, b) => {
      const wa = a.weekday ?? 0;
      const wb = b.weekday ?? 0;
      const ma = (wa + 6) % 7; // Mon(1)→0,... Sun(0)→6
      const mb = (wb + 6) % 7;
      return ma - mb;
    });
  }

  return buckets;
}

export function getCategoryDistribution(
  logs: LogEntry[],
  categories: Category[],
) {
  const minutesByCategory = new Map<string, number>();

  logs.forEach((log) => {
    const prev = minutesByCategory.get(log.categoryId) ?? 0;
    minutesByCategory.set(log.categoryId, prev + log.durationMinutes);
  });

  return categories
    .map((cat) => ({
      categoryId: cat.id,
      name: cat.name,
      minutes: minutesByCategory.get(cat.id) ?? 0,
      color: cat.color,
    }))
    .filter((item) => item.minutes > 0);
}

export function getRangeStats(logs: LogEntry[], days: number) {
  const totalMinutes = getRangeTotalMinutes(logs, days);
  const deepMinutes = getDeepWorkMinutes(logs, days);

  return {
    totalLabel: formatMinutesHuman(totalMinutes),
    deepLabel: formatMinutesHuman(deepMinutes),
  };
}

