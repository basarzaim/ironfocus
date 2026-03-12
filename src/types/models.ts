export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  color?: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  title: string;
  categoryId: CategoryId;
  tags: string[];
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number;
  notes?: string;
  date: string; // YYYY-MM-DD derived from startTime
  createdAt: string; // ISO string
}

export type TimerMode = "idle" | "stopwatch" | "focus";

export interface TimerSession {
  id: string;
  mode: TimerMode;
  presetMinutes?: number;
  startedAt: string; // ISO string
  stoppedAt?: string; // ISO string
  durationSeconds: number;
}

