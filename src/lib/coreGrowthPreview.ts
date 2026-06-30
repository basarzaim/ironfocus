import type { TimerMode } from "../types/models";
import { STORAGE_KEYS } from "./storageKeys";

/** Max session depth scale in cores (180 min). */
export const MAX_DEPTH_SECONDS = 180 * 60;

/** Real seconds to ramp cores to max depth. */
export const GROWTH_PREVIEW_RAMP_SECONDS = 30;

export function getInitialGrowthPreviewEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEYS.coreGrowthPreview);
  if (stored === null) return true;
  return stored === "1";
}

export function setGrowthPreviewEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.coreGrowthPreview,
    enabled ? "1" : "0",
  );
}

/**
 * Maps real session elapsed time to virtual elapsed/target for core visuals only.
 * 30 s real → ~3 h max depth (180 min cap). Timer digits/notifications stay real.
 */
export function getCoreGrowthPreviewProps(args: {
  elapsedSeconds: number;
  targetSeconds: number | null;
  mode: TimerMode;
  enabled: boolean;
}): { elapsedSeconds: number; targetSeconds: number | null } {
  const { elapsedSeconds, targetSeconds, mode, enabled } = args;

  if (!enabled || mode === "idle" || elapsedSeconds <= 0) {
    return { elapsedSeconds, targetSeconds };
  }

  const frac = Math.min(elapsedSeconds / GROWTH_PREVIEW_RAMP_SECONDS, 1);
  // Slightly under 100% so focus mode stays "running", not "finished".
  const previewElapsed = frac * MAX_DEPTH_SECONDS * 0.995;

  if (mode === "focus") {
    return {
      elapsedSeconds: previewElapsed,
      targetSeconds: MAX_DEPTH_SECONDS,
    };
  }

  return {
    elapsedSeconds: previewElapsed,
    targetSeconds: null,
  };
}
