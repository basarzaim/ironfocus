import { describe, expect, it } from "vitest";
import {
  mergeBackupData,
  validateBackupPayload,
  BACKUP_SCHEMA_VERSION,
} from "./dataBackup";
import type { Category, LogEntry } from "../types/models";

const category: Category = {
  id: "cat-1",
  name: "Deep Work",
  color: "#fbbf24",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const log: LogEntry = {
  id: "log-1",
  title: "Session",
  categoryId: "cat-1",
  tags: [],
  startTime: "2026-01-01T09:00:00.000Z",
  endTime: "2026-01-01T10:00:00.000Z",
  durationMinutes: 60,
  date: "2026-01-01",
  createdAt: "2026-01-01T10:00:00.000Z",
};

describe("dataBackup", () => {
  it("validates a correct payload", () => {
    const result = validateBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [log],
    });

    expect(result.ok).toBe(true);
  });

  it("rejects orphan category references", () => {
    const result = validateBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [{ ...log, categoryId: "missing" }],
    });

    expect(result.ok).toBe(false);
  });

  it("round-trips a valid accentId", () => {
    const result = validateBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [log],
      accentId: "blue",
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.accentId).toBe("blue");
  });

  it("falls back to classic for an invalid accentId", () => {
    const result = validateBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [log],
      accentId: "not-a-real-accent",
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.accentId).toBe("classic");
  });

  it("falls back to classic for a legacy payload with no accentId field", () => {
    const result = validateBackupPayload({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [log],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.accentId).toBe("classic");
  });

  it("merges without duplicating ids", () => {
    const importedLog: LogEntry = {
      ...log,
      id: "log-2",
      title: "Imported",
    };

    const merged = mergeBackupData([category], [log], {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.2.0",
      categories: [category],
      logs: [log, importedLog],
    });

    expect(merged.stats.logsAdded).toBe(1);
    expect(merged.stats.logsSkipped).toBe(1);
    expect(merged.logs).toHaveLength(2);
  });
});
