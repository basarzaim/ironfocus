import { PRODUCT_INFO } from "../config/productInfo";
import {
  createBackupPayload,
  parseBackupJson,
  type BackupPayload,
} from "./dataBackup";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadJsonInBrowser(payload: BackupPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ironfocus-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveBackupToFile(
  payload: BackupPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTauriRuntime()) {
    try {
      downloadJsonInBrowser(payload);
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not download backup file." };
    }
  }

  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const path = await save({
      defaultPath: `ironfocus-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: "IronFocus Backup", extensions: ["json"] }],
    });

    if (!path) {
      return { ok: false, error: "Export cancelled." };
    }

    await writeTextFile(path, JSON.stringify(payload, null, 2));
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save backup file.";
    return { ok: false, error: message };
  }
}

export async function loadBackupFromFile(): Promise<
  | { ok: true; data: BackupPayload }
  | { ok: false; error: string; cancelled?: boolean }
> {
  if (!isTauriRuntime()) {
    return loadBackupFromBrowserFilePicker();
  }

  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const path = await open({
      multiple: false,
      filters: [{ name: "IronFocus Backup", extensions: ["json"] }],
    });

    if (!path || Array.isArray(path)) {
      return { ok: false, error: "Import cancelled.", cancelled: true };
    }

    const text = await readTextFile(path);
    const parsed = parseBackupJson(text);
    if (!parsed.ok) return parsed;
    return parsed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read backup file.";
    return { ok: false, error: message };
  }
}

function loadBackupFromBrowserFilePicker(): Promise<
  | { ok: true; data: BackupPayload }
  | { ok: false; error: string; cancelled?: boolean }
> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, error: "Import cancelled.", cancelled: true });
        return;
      }
      try {
        const text = await file.text();
        resolve(parseBackupJson(text));
      } catch {
        resolve({ ok: false, error: "Could not read selected file." });
      }
    };

    input.click();
  });
}

export function buildExportPayload(
  categories: Parameters<typeof createBackupPayload>[0],
  logs: Parameters<typeof createBackupPayload>[1],
): BackupPayload {
  void PRODUCT_INFO;
  return createBackupPayload(categories, logs);
}
