import { useState } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { usePreferences } from "../../state/PreferencesProvider";
import { useTheme } from "../../state/ThemeProvider";
import {
  loadBackupFromFile,
  saveBackupToFile,
} from "../../lib/dataBackupFile";
import type { BackupPayload } from "../../lib/dataBackup";
import type { RetentionPolicy } from "../../lib/userPreferences";

type ImportPreview = {
  payload: BackupPayload;
  mode: "merge" | "replace";
};

export function DataManagementSection() {
  const {
    categories,
    logs,
    exportSnapshot,
    importFromJson,
    clearAllData,
    lastRetentionRemovedCount,
    storageIssues,
    storageWriteError,
    clearStorageWriteError,
  } = useAppState();
  const { preferences, setRetentionPolicy, applyRetentionNow } =
    usePreferences();
  const { accentId, setAccentId } = useTheme();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const accentBtn =
    "border-[rgb(var(--if-accent-rgb)/60%)] bg-[rgb(var(--if-accent-strong-rgb)/80%)] text-[var(--if-accent-on)] hover:bg-[rgb(var(--if-accent-rgb))]";

  async function handleExport() {
    setError(null);
    setMessage(null);
    const payload = exportSnapshot(accentId);
    const result = await saveBackupToFile(payload);
    if (!result.ok) {
      if (result.error !== "Export cancelled.") {
        setError(result.error);
      }
      return;
    }
    setMessage(
      `Exported ${logs.length} logs and ${categories.length} categories.`,
    );
  }

  async function handleImportPick(mode: "merge" | "replace") {
    setError(null);
    setMessage(null);
    const loaded = await loadBackupFromFile();
    if (!loaded.ok) {
      if (!loaded.cancelled) setError(loaded.error);
      return;
    }
    setImportPreview({ payload: loaded.data, mode });
  }

  function confirmImport() {
    if (!importPreview) return;
    setError(null);
    const result = importFromJson(
      JSON.stringify(importPreview.payload),
      importPreview.mode,
    );
    setImportPreview(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (importPreview.mode === "merge" && result.stats) {
      setMessage(
        `Merged: +${result.stats.logsAdded} logs, +${result.stats.categoriesAdded} categories (${result.stats.logsSkipped} logs skipped as duplicates).`,
      );
    } else {
      setAccentId(importPreview.payload.accentId ?? "classic");
      setMessage("Data replaced from backup.");
    }
  }

  function handleClearAll() {
    clearAllData();
    setShowClearConfirm(false);
    setMessage("All logs cleared. Categories reset to defaults.");
  }

  function handleRetentionChange(value: string) {
    const policy = value as RetentionPolicy;
    setRetentionPolicy(policy);
    if (policy === "all") {
      setMessage("Retention disabled — all logs kept.");
      return;
    }
    const removed = applyRetentionNow();
    setMessage(
      removed > 0
        ? `Retention set to ${policy} days. Removed ${removed} old log${removed === 1 ? "" : "s"}.`
        : `Retention set to ${policy} days. No logs matched yet.`,
    );
  }

  function handleApplyRetention() {
    const removed = applyRetentionNow();
    setMessage(
      removed > 0
        ? `Removed ${removed} log${removed === 1 ? "" : "s"} by retention policy.`
        : "No logs matched the retention policy.",
    );
  }

  return (
    <div className="space-y-3">
      {storageWriteError ? (
        <div className="rounded-md border border-red-500/40 bg-red-950/30 p-3 text-[11px] text-red-200">
          Could not save data: {storageWriteError}. Export a backup now.
          <button
            type="button"
            onClick={clearStorageWriteError}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {storageIssues.length > 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100/90">
          {storageIssues.join(" ")} Try importing a backup if data looks wrong.
        </div>
      ) : null}
      <p className="text-[11px] leading-relaxed text-neutral-500">
        Data stays on this device until cloud sync arrives. Export regularly
        before imports or retention cleanup.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExport()}
          className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${accentBtn}`}
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => void handleImportPick("merge")}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-200 hover:border-neutral-500"
        >
          Import (merge)
        </button>
        <button
          type="button"
          onClick={() => void handleImportPick("replace")}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-300 hover:border-red-500/50 hover:text-red-200"
        >
          Import (replace)
        </button>
      </div>

      <div className="space-y-1.5 border-t border-neutral-800 pt-3">
        <label className="block text-[11px] font-semibold text-neutral-300">
          Log retention
        </label>
        <select
          value={String(preferences.retentionPolicy)}
          onChange={(e) => handleRetentionChange(e.target.value)}
          className="w-full max-w-xs rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
        >
          <option value="all">Keep all logs</option>
          <option value="90">Auto-delete older than 90 days</option>
          <option value="180">Auto-delete older than 180 days</option>
          <option value="365">Auto-delete older than 365 days</option>
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApplyRetention}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
          >
            Run cleanup now
          </button>
          {preferences.lastRetentionRunAt ? (
            <span className="text-[10px] text-neutral-600">
              Last run:{" "}
              {new Date(preferences.lastRetentionRunAt).toLocaleDateString()}
            </span>
          ) : null}
          {lastRetentionRemovedCount > 0 ? (
            <span className="text-[10px] text-neutral-600">
              Startup cleanup removed {lastRetentionRemovedCount} log
              {lastRetentionRemovedCount === 1 ? "" : "s"}.
            </span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-3">
        {!showClearConfirm ? (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="text-[11px] font-medium text-red-400/80 hover:text-red-300"
          >
            Clear all data…
          </button>
        ) : (
          <div className="space-y-2 rounded-md border border-red-900/50 bg-red-950/20 p-3">
            <p className="text-[11px] text-red-200/90">
              This removes all logs and resets categories. Export first if you
              need a backup.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md border border-red-500/60 bg-red-900/40 px-3 py-1 text-[11px] font-semibold text-red-100"
              >
                Confirm clear
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-md border border-neutral-700 px-3 py-1 text-[11px] text-neutral-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {importPreview ? (
        <div className="rounded-md border border-neutral-700 bg-neutral-950/80 p-3">
          <p className="text-[11px] font-medium text-neutral-200">
            {importPreview.mode === "merge" ? "Merge" : "Replace"} backup?
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            File contains {importPreview.payload.logs.length} logs and{" "}
            {importPreview.payload.categories.length} categories.
            {importPreview.mode === "replace"
              ? " This replaces all current data."
              : " New entries merge; duplicate IDs are skipped."}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmImport}
              className={`rounded-md border px-3 py-1 text-[11px] font-semibold ${accentBtn}`}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setImportPreview(null)}
              className="rounded-md border border-neutral-700 px-3 py-1 text-[11px] text-neutral-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="text-[11px] text-emerald-400/90" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
