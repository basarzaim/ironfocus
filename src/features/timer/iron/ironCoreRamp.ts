/** Blender Color Ramp: yellow fixed at 0, black stop slides with session depth. */

export const CORE_RAMP_YELLOW_POS = 0 as const;
export const CORE_RAMP_BLACK_START = 0.022 as const;
export const CORE_RAMP_BLACK_END = 0.132 as const;

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

/** depthParam 0→1 (~180 min focus) slides only the black stop like Blender. */
export function resolveCoreRampStops(depthParam: number): CoreRampStops {
  const t = clamp01(depthParam);
  return {
    blackThreshold: lerp(CORE_RAMP_BLACK_START, CORE_RAMP_BLACK_END, t),
  };
}
