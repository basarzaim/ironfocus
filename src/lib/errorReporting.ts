import { getPersistedValue, setPersistedValue } from "./persistence/persistenceClient";
import { STORAGE_KEYS } from "./storageKeys";

export type StoredErrorReport = {
  message: string;
  stack?: string;
  source: "react" | "window" | "promise";
  timestamp: string;
};

export function recordErrorReport(report: StoredErrorReport): void {
  try {
    setPersistedValue(STORAGE_KEYS.lastError, JSON.stringify(report));
  } catch {
    // ignore persistence failures during error reporting
  }
}

export function getLastErrorReport(): StoredErrorReport | null {
  try {
    const raw = getPersistedValue(STORAGE_KEYS.lastError);
    if (!raw) return null;
    return JSON.parse(raw) as StoredErrorReport;
  } catch {
    return null;
  }
}

export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    recordErrorReport({
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      source: "window",
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    recordErrorReport({
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
      stack: reason instanceof Error ? reason.stack : undefined,
      source: "promise",
      timestamp: new Date().toISOString(),
    });
  });
}

export function formatDiagnosticsBundle(): string {
  const lastError = getLastErrorReport();
  const lines = [navigator.userAgent, navigator.platform];
  if (lastError) {
    lines.push(
      `Last error (${lastError.source}) @ ${lastError.timestamp}`,
      lastError.message,
      lastError.stack ?? "",
    );
  }
  return lines.filter(Boolean).join("\n");
}
