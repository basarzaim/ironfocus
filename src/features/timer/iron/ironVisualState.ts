import type { TimerMode } from "../../../types/models";
import { IRON_SCENE_TUNING } from "./ironVisualTuning";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Finer veins at session start; eases to neutral (1) at full depth. */
export function resolveVeinUvScale(depthParam: number): number {
  const { coreVisualDepthBase, veinUvScaleStart } = IRON_SCENE_TUNING;
  if (veinUvScaleStart <= 1) return 1;
  if (coreVisualDepthBase >= 1) return 1;
  const t = clamp01((depthParam - coreVisualDepthBase) / (1 - coreVisualDepthBase));
  return veinUvScaleStart + (1 - veinUvScaleStart) * t;
}

/** Effective shader detail scale — amplifies start thinning without UV smear. */
export function resolveVeinDetailScale(depthParam: number): number {
  if (IRON_SCENE_TUNING.previewThinVeins) return 1;
  const eased = resolveVeinUvScale(depthParam);
  const strength = IRON_SCENE_TUNING.veinDetailStrength ?? 1;
  return 1 + (eased - 1) * strength;
}

/**
 * Session progress 0→1 above coreVisualDepthBase.
 * Use for FX that must not fire at the calibrated visual start.
 */
export function resolveSessionProgress(depthParam: number): number {
  const base = IRON_SCENE_TUNING.coreVisualDepthBase;
  if (depthParam <= base) return 0;
  if (base >= 1) return clamp01(depthParam);
  return clamp01((depthParam - base) / (1 - base));
}

/** Gated 0→1 ramp for aura FX after session onset. */
export function resolveAuraDepthGate(depthParam: number): number {
  const { onset, span } = IRON_SCENE_TUNING.aura;
  const progress = resolveSessionProgress(depthParam);
  return clamp01((progress - onset) / span);
}

/** 0 at visual start — orange vein core builds as session grows past coreVisualDepthBase. */
export function resolveVeinOrangeStrength(depthParam: number): number {
  const { onset, span, maxMix } = IRON_SCENE_TUNING.veinOrange;
  const progress = resolveSessionProgress(depthParam);
  return clamp01((progress - onset) / span) * maxMix;
}

/** 0 at visual start — cavity AO from texture G builds with session progress. */
export function resolveCellAoStrength(depthParam: number): number {
  const { onset, span, maxStrength } = IRON_SCENE_TUNING.cellAo;
  const progress = resolveSessionProgress(depthParam);
  return clamp01((progress - onset) / span) * maxStrength;
}

export type IronCoreStatus = "idle" | "running" | "paused" | "finished";

export const IRON_COLORS = {
  iron: "#1a1816",
  ironMid: "#242220",
  ironRim: "#3a3632",
  bronze: "#7a5c1e",
  bronzeLt: "#a07830",
  gold: "#c8921a",
  goldBright: "#e8b450",
  amber: "#f5a623",
  warmWhite: "#fdf4e7",
} as const;

const MAX_SESSION_SECONDS = 180 * 60;

/** Core size at session start (depth 0). Growth span stays fixed for consistent rate. */
export const CORE_BASE_SCALE = 0.69;
export const CORE_MAX_GROWTH = 0.125;

export interface IronTimerInput {
  mode: TimerMode;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
}

export interface IronAnimState {
  t: number;
  coreScale: number;
  precession: number;
}

export interface IronVisualFrame {
  status: IronCoreStatus;
  /** Session depth for shell level swap (0 → ShellLevel_00, no presentation boost). */
  shellDepthParam: number;
  /** Boosted depth for core veins, glow, heat, scale. */
  depthParam: number;
  ironHeat: number;
  breathDepth: number;
  rawBreath: number;
  breath: number;
  glowBreathEnv: number;
  glow: number;
  coreScale: number;
  precession: number;
  breathExpand: number;
  ringBreathExpand: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function smooth01(f: number): number {
  const x = clamp01(f);
  return x * x * (3 - 2 * x);
}

export function deriveIronStatus(input: IronTimerInput): IronCoreStatus {
  const { mode, isRunning, elapsedSeconds, targetSeconds } = input;
  if (mode === "idle") return "idle";
  if (isRunning) return "running";
  if (mode === "focus" && targetSeconds !== null && elapsedSeconds >= targetSeconds) {
    return "finished";
  }
  return "paused";
}

function ironBreathSignal(t: number, freqRadPerMs: number, inhaleFraction = 0.57): number {
  if (freqRadPerMs <= 0) return 0;
  const period = (Math.PI * 2) / freqRadPerMs;
  const cycleT = t % period;
  const inhaleDur = period * inhaleFraction;
  if (cycleT < inhaleDur) {
    return -1 + 2 * smooth01(cycleT / inhaleDur);
  }
  return 1 - 2 * smooth01((cycleT - inhaleDur) / (period - inhaleDur));
}

function ironBreathDepth(heat: number): number {
  return 0.26 + smooth01(heat) * 0.74;
}

function ironDepthBrightness(heat: number): { floor: number; peak: number } {
  const h = smooth01(heat);
  return { floor: lerp(0.06, 0.22, h), peak: lerp(0.32, 1.0, h) };
}

function ironSessionHeat(status: IronCoreStatus, depth: number): number {
  if (status === "finished") return 1;
  if (status === "running") return smooth01(depth);
  if (status === "paused") return smooth01(depth * 0.85);
  return smooth01(depth);
}

function computeDepthParam(input: IronTimerInput): number {
  const { mode, elapsedSeconds, targetSeconds } = input;
  if (mode === "focus" && targetSeconds !== null && targetSeconds > 0) {
    const progress = Math.min(1, elapsedSeconds / targetSeconds);
    const depthScale = Math.min(targetSeconds / MAX_SESSION_SECONDS, 1.0);
    return Math.min(progress * (0.55 + depthScale * 0.45) + depthScale * 0.12, 1.0);
  }
  if (mode === "stopwatch") {
    return Math.min(elapsedSeconds / MAX_SESSION_SECONDS, 1.0);
  }
  return 0;
}

/** Lift session start to calibrated depth; progress still runs base → 1. */
function resolveVisualDepthParam(rawDepth: number): number {
  if (IRON_SCENE_TUNING.previewThinVeins) return clamp01(rawDepth);
  const base = IRON_SCENE_TUNING.coreVisualDepthBase;
  if (rawDepth <= 0) return base;
  return base + (1 - base) * clamp01(rawDepth);
}

/** Advance iron animation clock and derive visual frame for the 3D rig. */
export function stepIronVisual(
  anim: IronAnimState,
  input: IronTimerInput,
  dt: number,
  reduced: boolean,
): IronVisualFrame {
  anim.t += dt;

  const status = deriveIronStatus(input);
  const rawDepth = computeDepthParam(input);
  const depthParam = resolveVisualDepthParam(rawDepth);
  const ironHeat = ironSessionHeat(status, depthParam);
  const breathDepth = ironBreathDepth(ironHeat);
  const ironBright = ironDepthBrightness(ironHeat);

  const breathFreq =
    status === "running"
      ? 0.0005 - depthParam * 0.0002
      : 0.00012;

  let rawBreath = 0;
  let breath = 0;
  let glowBreathEnv = 1;
  const idleBreathScale = status === "idle" ? 0.42 : 1;

  if (!reduced) {
    rawBreath = ironBreathSignal(anim.t, breathFreq, 0.57);
    breath = rawBreath * breathDepth * idleBreathScale;
    const inhaleNorm = (rawBreath + 1) / 2;
    const glowSwing = 0.18 + ironHeat * 0.82;
    glowBreathEnv =
      ironBright.floor +
      (ironBright.peak - ironBright.floor) *
        Math.pow(clamp01(inhaleNorm), 1.22 + ironHeat * 0.28);
    glowBreathEnv *= 0.55 + glowSwing * 0.45;
  }

  let glow: number;
  if (status === "running") {
    glow =
      ironBright.floor +
      (ironBright.peak - ironBright.floor) * glowBreathEnv * (0.55 + ironHeat * 0.45);
  } else if (status === "idle") {
    glow =
      ironBright.floor +
      (ironBright.peak - ironBright.floor) * glowBreathEnv * (0.55 + ironHeat * 0.45);
  } else if (status === "paused") {
    glow = ironBright.floor + (ironBright.peak - ironBright.floor) * 0.45;
  } else {
    glow = ironBright.peak * (0.55 + 0.45 * glowBreathEnv);
  }
  glow = Math.min(1.18, glow);

  const breathExpand =
    status === "running"
      ? (0.028 + ironHeat * 0.045) * breathDepth
      : status === "idle"
        ? 0
        : 0.022 * breathDepth;
  const ringBreathExpand = (0.022 + ironHeat * 0.065) * breathDepth;

  const depthGrowth = depthParam;
  const scaleTarget = CORE_BASE_SCALE + depthGrowth * CORE_MAX_GROWTH;
  const scaleLerp = Math.min(dt * 0.0025, 1);
  anim.coreScale = lerp(anim.coreScale, scaleTarget, scaleLerp);

  if (!reduced && status === "running" && depthParam > 0.08) {
    anim.precession += dt * 0.00003 * (0.35 + depthParam * 0.65);
  }

  return {
    status,
    shellDepthParam: rawDepth,
    depthParam,
    ironHeat,
    breathDepth,
    rawBreath,
    breath,
    glowBreathEnv,
    glow,
    coreScale: anim.coreScale,
    precession: anim.precession,
    breathExpand,
    ringBreathExpand,
  };
}

/** First-frame visual state — matches idle @ coreVisualDepthBase (avoids shader uniform snap). */
export function bootstrapIronVisualFrame(reduced = false): IronVisualFrame {
  const anim: IronAnimState = {
    t: 0,
    coreScale: CORE_BASE_SCALE,
    precession: 0,
  };
  const input: IronTimerInput = {
    mode: "idle",
    isRunning: false,
    elapsedSeconds: 0,
    targetSeconds: null,
  };
  return stepIronVisual(anim, input, 0, reduced);
}

export function lerpIronColor(a: string, b: string, t: number): string {
  const u = clamp01(t);
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * u).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}
