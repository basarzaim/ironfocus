/** Blender Color Ramp: yellow fixed at 0, black stop slides with session depth. */

import { IRON_SCENE_TUNING } from "./ironVisualTuning";
import { resolveSessionProgress } from "./ironVisualState";

export const CORE_RAMP_YELLOW_POS = 0 as const;
export const CORE_RAMP_BLACK_START = 0.022 as const;
/** Calibrated look at coreVisualDepthBase (~10s preview). */
export const CORE_RAMP_BLACK_CALIBRATED_END = 0.132 as const;
/** Session end — veins swell before lava flood. */
export const CORE_RAMP_BLACK_END = 0.48 as const;
/** >1 = hold thin longer, thicken sharply near session end. */
export const CORE_RAMP_BLACK_EASE_POWER = 2.35 as const;
/** Final yellow-orange lava flood — ramps in second half of session. */
export const CORE_RAMP_FLOOD_POWER = 2.6 as const;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface CoreRampStops {
  /** Position of the black stop on the ramp (yellow stays at 0). */
  blackThreshold: number;
}

/** depthParam ≤ base: original calibrated ramp. Above base: swell toward BLACK_END. */
export function resolveCoreRampStops(depthParam: number): CoreRampStops {
  const t = clamp01(depthParam);
  const base = IRON_SCENE_TUNING.coreVisualDepthBase;
  const calibratedAtBase = lerp(
    CORE_RAMP_BLACK_START,
    CORE_RAMP_BLACK_CALIBRATED_END,
    base,
  );

  if (t <= base) {
    return {
      blackThreshold: lerp(CORE_RAMP_BLACK_START, CORE_RAMP_BLACK_CALIBRATED_END, t),
    };
  }

  const progress = (t - base) / (1 - base);
  const eased = Math.pow(progress, CORE_RAMP_BLACK_EASE_POWER);
  return {
    blackThreshold: lerp(calibratedAtBase, CORE_RAMP_BLACK_END, eased),
  };
}

/** 0 at visual start → 1 at session end (molten yellow-orange flood). */
export function resolveVeinFloodMix(depthParam: number): number {
  const progress = resolveSessionProgress(depthParam);
  return Math.pow(clamp01(progress), CORE_RAMP_FLOOD_POWER);
}
