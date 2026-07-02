import { useRef, useEffect, type FC } from "react";
import { ACCENT_TIMER_OVERLAY } from "../../../lib/accentStyles";
import type { TimerMode } from "../../../types/models";

// ── Public API (drop-in compatible with LivingCore / PlasmaCore) ────────────────

export interface ReactorCoreProps {
  mode: TimerMode;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  /** Formatted display string, e.g. "01:30:00" */
  displayTime: string;
  /** Tailwind classes for the wrapper. Controls visual size. */
  className?: string;
  /** Ambient background layer (edge fade handled by CSS wrapper, not canvas). */
  ambient?: boolean;
  /** When false, timer digits are omitted (parent renders them in the UI stack). */
  showTimer?: boolean;
  /** Visual treatment. "reactor" = original cinematic style, "iron" = calmer forged style. */
  visualStyle?: ReactorVisualStyle;
}

// ── Internal types ──────────────────────────────────────────────────────────────

type CoreStatus = "idle" | "running" | "paused" | "finished";
export type ReactorVisualStyle = "reactor" | "iron";

/** Expanding shock ring — a discharged power pulse leaving the core. */
interface Shock {
  age: number;
  life: number;
  power: number;
}

/** Short-lived confinement arc flickering across the core. */
interface Arc {
  age: number;
  life: number;
  a0: number;
  a1: number;
  seed: number;
}

/** Ejected spark with a fading motion trail. */
interface Spark {
  x: number; y: number;     // position (fraction of maxR from centre, world px added later)
  px: number; py: number;   // previous position (for trail)
  vx: number; vy: number;   // velocity (px/ms)
  age: number;
  life: number;
  size: number;
}

/** Fixed granular cell on the core surface (magma texture). */
interface Grain {
  r: number;     // radius fraction (0..1)
  a: number;     // angle
  size: number;  // fraction of R
  phase: number; // flicker phase
}

interface CanvasState {
  t: number;
  status: CoreStatus;
  prevStatus: CoreStatus;
  progress: number;
  depthParam: number;
  jitterT: number;
  coreScale: number;
  irisSpin: number;
  bloomT: number;
  finishT: number;
  shockTimer: number;
  arcTimer: number;
  sparkTimer: number;
  shocks: Shock[];
  arcs: Arc[];
  sparks: Spark[];
  grains: Grain[];
}

// ── Palette (dark iron / bronze / molten gold + blackbody hot/cool extremes) ────

const K = {
  IRON:       "#1a1816",
  IRON_MID:   "#242220",
  IRON_RIM:   "#3a3632",
  BRONZE:     "#7a5c1e",
  BRONZE_LT:  "#a07830",
  GOLD:       "#c8921a",
  GOLD_BRT:   "#e8b450",
  AMBER:      "#f5a623",
  WARM_WHITE: "#fdf4e7",
  HOT_WHITE:  "#fffdf8", // hottest core
  EMBER_RED:  "#9a3a12", // coolest visible edge (blackbody tail)
} as const;

const BLOOM_MS = 560;
const FINISH_MS = 1400;
const SHOCK_LIFE = 1300;
const ARC_LIFE = 150;
const GLOW_SCALE = 0.32; // offscreen bloom resolution factor

// ── Utilities ───────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

function deriveStatus(
  mode: TimerMode,
  isRunning: boolean,
  elapsedSeconds: number,
  targetSeconds: number | null,
): CoreStatus {
  if (mode === "idle") return "idle";
  if (isRunning) return "running";
  if (mode === "focus" && targetSeconds !== null && elapsedSeconds >= targetSeconds)
    return "finished";
  return "paused";
}

/** Smoothstep for organic easing (no linear robotic ramps). */
function smooth01(f: number): number {
  const x = clamp01(f);
  return x * x * (3 - 2 * x);
}

/**
 * Asymmetric breath for Iron Core: slower inhale (~57% of cycle), quicker exhale.
 * Returns −1 (exhale valley) … +1 (inhale peak).
 */
function ironBreathSignal(
  t: number,
  freqRadPerMs: number,
  inhaleFraction = 0.57,
): number {
  if (freqRadPerMs <= 0) return 0;
  const period = (Math.PI * 2) / freqRadPerMs;
  const cycleT = t % period;
  const inhaleDur = period * inhaleFraction;
  if (cycleT < inhaleDur) {
    return -1 + 2 * smooth01(cycleT / inhaleDur);
  }
  return 1 - 2 * smooth01((cycleT - inhaleDur) / (period - inhaleDur));
}

/** Position within the current breath cycle, 0 … 1. */
function ironBreathCyclePhase(t: number, freqRadPerMs: number): number {
  if (freqRadPerMs <= 0) return 0;
  const period = (Math.PI * 2) / freqRadPerMs;
  return (t % period) / period;
}

/**
 * Sharp step gate for concentric rings: one ring lights per breath slice.
 * Inhale inside→out, exhale outside→in.
 */
function ironRingStepPulse(
  cyclePhase: number,
  ringIndex: number,
  ringCount: number,
  inhaleFraction = 0.57,
): number {
  const slot = 1 / ringCount;
  const half = slot * 0.36;
  if (cyclePhase < inhaleFraction) {
    const p = cyclePhase / inhaleFraction;
    const center = (ringIndex + 0.5) * slot;
    const raw = clamp01(1 - Math.abs(p - center) / half);
    return raw * raw * (3 - 2 * raw);
  }
  const p = (cyclePhase - inhaleFraction) / (1 - inhaleFraction);
  const center = 1 - (ringIndex + 0.5) * slot;
  const raw = clamp01(1 - Math.abs(p - center) / half);
  return raw * raw * (3 - 2 * raw);
}

/** Breath amplitude & glow swing grow as the core heats up (0 … 1). */
function ironBreathDepth(heat: number): number {
  return 0.26 + smooth01(heat) * 0.74;
}

/** Base brightness floor/ceiling scales with session depth. */
function ironDepthBrightness(heat: number): { floor: number; peak: number } {
  const h = smooth01(heat);
  return { floor: lerp(0.06, 0.22, h), peak: lerp(0.32, 1.0, h) };
}

function lerpColorHex(a: string, b: string, t: number): string {
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

/** Session depth → 0 cold forged metal, 1 energised core. */
function ironSessionHeat(status: CoreStatus, depth: number): number {
  if (status === "finished") return 1;
  if (status === "running") return smooth01(depth);
  if (status === "paused") return smooth01(depth * 0.85);
  return smooth01(depth * 0.12);
}

/** Ring brightness: depth base × breath step (rings only). */
function ironRingBright(
  heat: number,
  glowBreathEnv: number,
  ringStep: number,
): number {
  const { floor, peak } = ironDepthBrightness(heat);
  const breathLevel = floor + (peak - floor) * glowBreathEnv;
  return breathLevel * (0.08 + 0.92 * ringStep);
}

function mkGrains(): Grain[] {
  return Array.from({ length: 70 }, () => ({
    r: Math.sqrt(Math.random()) * 0.92,
    a: Math.random() * Math.PI * 2,
    size: 0.04 + Math.random() * 0.10,
    phase: Math.random() * Math.PI * 2,
  }));
}

// ── Drawing helpers ──────────────────────────────────────────────────────────────

function beam(
  ctx: CanvasRenderingContext2D,
  len: number,
  halfW: number,
  alpha: number,
  color: string,
): void {
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.4, rgba(color, alpha * 0.28));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -halfW);
  ctx.lineTo(len, 0);
  ctx.lineTo(0, halfW);
  ctx.closePath();
  ctx.fill();
}

/** Double-stroke metal containment ring with rivets. lit = energised fraction. */
function irisRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  segs: number,
  gap: number,
  spin: number,
  width: number,
  glow: number,
  lit: number,
  rivets: boolean,
): void {
  const span = (Math.PI * 2) / segs;
  ctx.lineCap = "round";
  for (let i = 0; i < segs; i++) {
    const start = i * span + spin;
    const end = start + span * (1 - gap);
    // Dark base (metal shadow).
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.strokeStyle = rgba(K.IRON, 0.9);
    ctx.lineWidth = width;
    ctx.stroke();
    // Bronze midtone.
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.strokeStyle = rgba(K.IRON_RIM, 0.7 + glow * 0.2);
    ctx.lineWidth = width * 0.66;
    ctx.stroke();
    // Energised bright core line.
    const segLit = clamp01(lit * segs - i);
    const heat = Math.max(glow * 0.5, segLit);
    if (heat > 0.04) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = rgba(K.GOLD_BRT, 0.22 + heat * 0.62);
      ctx.lineWidth = width * 0.30;
      ctx.shadowColor = K.GOLD;
      ctx.shadowBlur = 4 + heat * 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Rivets at the leading edge of each segment.
    if (rivets) {
      const rx = cx + radius * Math.cos(start);
      const ry = cy + radius * Math.sin(start);
      ctx.beginPath();
      ctx.arc(rx, ry, width * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = rgba(K.BRONZE_LT, 0.5 + glow * 0.3);
      ctx.fill();
    }
  }
  ctx.lineCap = "butt";
}

// ── Master draw ──────────────────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  glowCtx: CanvasRenderingContext2D,
  grainPattern: CanvasPattern | null,
  cssW: number,
  cssH: number,
  dpr: number,
  st: CanvasState,
  ambient: boolean,
  reduced: boolean,
  visualStyle: ReactorVisualStyle,
): void {
  const canvas = ctx.canvas;
  const cx = cssW / 2;
  const cy = cssH / 2;
  const maxR = Math.min(cssW, cssH) / 2;
  const isIron = visualStyle === "iron";
  const d = st.depthParam;

  // ── Breath: iron = one shared clock + step pulse; reactor = sinus + throb ──
  const breathFreq =
    st.status === "running"
      ? isIron
        ? 0.00050 - d * 0.00020
        : 0.00036 - d * 0.00018
      : isIron
        ? 0.000155
        : 0.00012;

  let breath = 0;
  let glowBreathEnv = 1;
  let ironCyclePhase = 0;
  let rawIronBreath = 0;
  const ironHeat = isIron ? ironSessionHeat(st.status, d) : 0;
  const breathDepth = isIron ? ironBreathDepth(ironHeat) : 1;
  const ironBright = isIron ? ironDepthBrightness(ironHeat) : { floor: 0, peak: 1 };
  const ironStriationCount = isIron ? Math.max(2, Math.round(lerp(2, 4, ironHeat))) : 0;
  const ironRingCount = isIron ? ironStriationCount + 2 : 0;

  if (isIron && !reduced) {
    rawIronBreath = ironBreathSignal(st.t, breathFreq, 0.57);
    breath = rawIronBreath * breathDepth;
    ironCyclePhase = ironBreathCyclePhase(st.t, breathFreq);
    const inhaleNorm = (rawIronBreath + 1) / 2;
    const glowSwing = 0.18 + ironHeat * 0.82;
    glowBreathEnv =
      ironBright.floor +
      (ironBright.peak - ironBright.floor) *
        Math.pow(clamp01(inhaleNorm), 1.22 + ironHeat * 0.28);
    glowBreathEnv *= 0.55 + glowSwing * 0.45;
  } else if (!isIron && !reduced) {
    breath = Math.sin(st.t * breathFreq);
  }

  const throbFreq = 0.0016 + d * 0.0012;
  const throb = !isIron && !reduced && st.status === "running" ? Math.sin(st.t * throbFreq) : 0;
  const throbPeak = Math.max(0, throb) * Math.max(0, throb);
  const energy = clamp01(0.5 + 0.5 * breath);

  const bloomFrac = Math.max(0, st.bloomT / BLOOM_MS);
  const finishFrac = Math.max(0, st.finishT / FINISH_MS);
  const finishPow = finishFrac * finishFrac * finishFrac;

  let glow: number;
  if (st.status === "running") {
    glow = isIron
      ? ironBright.floor +
        (ironBright.peak - ironBright.floor) * glowBreathEnv * (0.55 + ironHeat * 0.45)
      : (0.20 + 0.62 * energy + 0.08 * (0.5 + 0.5 * throb)) * (0.46 + d * 0.40);
  } else if (st.status === "idle") {
    glow = isIron
      ? ironBright.floor + (ironBright.peak - ironBright.floor) * glowBreathEnv * 0.35
      : 0.05 + 0.04 * energy;
  } else if (st.status === "paused") {
    glow = isIron
      ? ironBright.floor + (ironBright.peak - ironBright.floor) * 0.45
      : 0.13;
  } else {
    glow = isIron
      ? ironBright.peak * (0.55 + 0.45 * glowBreathEnv)
      : 0.55 + 0.30 * (0.5 + 0.5 * Math.sin(st.t * 0.00185));
  }
  glow = Math.min(isIron ? 1.18 : 1.4, glow + finishPow * (isIron ? 0.42 : 1.2) + throbPeak * 0.04);

  const breathExpand = isIron
    ? st.status === "running"
      ? (0.028 + ironHeat * 0.045) * breathDepth
      : st.status === "idle"
        ? 0.018 * breathDepth
        : 0.022 * breathDepth
    : st.status === "running"
      ? 0.045 + d * 0.035
      : 0.02;
  const ringBreathExpand = isIron ? (0.022 + ironHeat * 0.065) * breathDepth : 0;
  let R = maxR * 0.26 * st.coreScale;
  R *= 1 + breath * breathExpand + throb * 0.009;
  R *= 1 + bloomFrac * bloomFrac * 0.12;
  R *= 1 + finishPow * 0.5;

  let jx = 0, jy = 0;
  if (st.status === "paused") {
    const jt = st.jitterT;
    const jAmt = R * (isIron ? 0.012 : 0.02);
    jx = Math.sin(jt * 0.0148) * Math.sin(jt * 0.0213) * jAmt;
    jy = Math.cos(jt * 0.0182) * Math.sin(jt * 0.0097) * jAmt;
  }
  const driftOn = !reduced && (st.status === "running" || st.status === "finished" || finishFrac > 0.05);
  const driftAmt = driftOn ? maxR * (isIron ? 0.0035 : 0.012) : 0;
  const ox = cx + jx + driftAmt * Math.sin(st.t * 0.00031);
  const oy = cy + jy + driftAmt * Math.cos(st.t * 0.00023);

  const hot = st.status === "running" || st.status === "finished";

  ctx.save();
  ctx.clearRect(0, 0, cssW, cssH);

  // 1. SHOCK RINGS.
  for (const s of st.shocks) {
    const f = s.age / s.life;
    if (f >= 1) continue;
    const rr = R * 1.2 + (maxR * 1.05 - R * 1.2) * f;
    const ironShockScale = isIron ? 0.22 : 1;
    const a = s.power * (1 - f) * (1 - f) * 0.5 * ironShockScale;
    if (a < 0.01) continue;
    ctx.beginPath();
    ctx.arc(ox, oy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(K.GOLD_BRT, a);
    ctx.lineWidth = 1 + (1 - f) * 2.4;
    ctx.stroke();
  }

  // 2. CORONA (soft, slightly DoF-blurred feel via large soft gradient).
  {
    const coronaRingIdx = isIron ? ironRingCount - 1 : 0;
    const coronaStep = isIron && !reduced
      ? ironRingStepPulse(ironCyclePhase, coronaRingIdx, ironRingCount)
      : 1;
    const coronaBright = isIron
      ? ironRingBright(ironHeat, glowBreathEnv, coronaStep)
      : glow;
    const coronaBreathMod = isIron ? 0.72 + 0.38 * coronaStep : 1;
    const coronaHeatBoost = isIron ? 0.55 + ironHeat * 0.65 : 1;
    const coronaR =
      R * (1.9 + coronaBright * 0.9 * coronaHeatBoost) * coronaBreathMod *
      (1 + bloomFrac * 0.5 + finishPow * 1.3);
    const g = ctx.createRadialGradient(ox, oy, R * 0.6, ox, oy, coronaR);
    const coronaGold = isIron ? lerpColorHex(K.BRONZE, K.GOLD, ironHeat) : K.GOLD;
    const coronaAmber = isIron ? lerpColorHex(K.IRON_RIM, K.AMBER, ironHeat) : K.AMBER;
    g.addColorStop(0, rgba(coronaGold, coronaBright * 0.38));
    g.addColorStop(0.3, rgba(coronaAmber, coronaBright * 0.13));
    g.addColorStop(0.7, rgba(K.BRONZE, coronaBright * 0.05 * (0.5 + ironHeat * 0.5)));
    g.addColorStop(1, rgba(coronaGold, 0));
    ctx.beginPath();
    ctx.arc(ox, oy, coronaR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // 3. GOD-RAYS leaking through the iris segment gaps.
  if (!isIron && hot && glow > 0.08) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalCompositeOperation = "lighter";
    const segs = 8;
    const span = (Math.PI * 2) / segs;
    const gap = 0.14;
    for (let i = 0; i < segs; i++) {
      const gapMid = i * span + span * (1 - gap * 0.5) + st.irisSpin;
      ctx.save();
      ctx.rotate(gapMid);
      ctx.translate(R * 1.3, 0);
      beam(ctx, R * (1.0 + glow * 1.2), R * 0.05, glow * 0.32, K.GOLD_BRT);
      ctx.restore();
    }
    ctx.restore();
  }

  // 4. DIFFRACTION SPIKES (with throb-peak length boost).
  if (!isIron && glow > 0.06) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(reduced ? 0.4 : st.t * 0.00006);
    ctx.globalCompositeOperation = "lighter";
    const longLen = R * (2.4 + glow * 2.4 + finishPow * 3 + throbPeak * 0.6);
    const shortLen = longLen * 0.5;
    const aLong = glow * 0.5 + finishPow * 0.4 + throbPeak * 0.06;
    const aShort = glow * 0.28;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * (Math.PI / 2));
      beam(ctx, longLen, R * 0.10, aLong, K.GOLD_BRT);
      ctx.restore();
    }
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(Math.PI / 4 + i * (Math.PI / 2));
      beam(ctx, shortLen, R * 0.07, aShort, K.AMBER);
      ctx.restore();
    }
    ctx.restore();
  }

  // 5. CONTAINMENT IRIS — rings step-pulse with breath; brightness grows with depth.
  {
    const irisInRingIdx = isIron ? ironStriationCount : 0;
    const irisOutRingIdx = isIron ? ironStriationCount + 1 : 0;

    const irisInStep = isIron && !reduced
      ? ironRingStepPulse(ironCyclePhase, irisInRingIdx, ironRingCount)
      : 1;
    const irisOutStep = isIron && !reduced
      ? ironRingStepPulse(ironCyclePhase, irisOutRingIdx, ironRingCount)
      : 1;

    const r1Base = R * 1.44;
    const r2Base = R * 1.74;
    const lit = st.status === "running" ? clamp01(0.08 + ironHeat * 0.92) : st.status === "finished" ? 1 : 0;
    const startOpen = isIron ? bloomFrac * 0.12 : 0;

    const irisInBright = isIron ? ironRingBright(ironHeat, glowBreathEnv, irisInStep) : glow;
    const irisOutBright = isIron ? ironRingBright(ironHeat, glowBreathEnv, irisOutStep) : glow;

    const innerGap = Math.min(
      0.34,
      0.14 + startOpen + (isIron ? (rawIronBreath + 1) * 0.014 * irisInStep : 0),
    );
    const outerGap = Math.min(
      0.50,
      0.30 + startOpen * 1.1 + (isIron ? (rawIronBreath + 1) * 0.012 * irisOutStep : 0),
    );
    const irisInGlow = isIron ? irisInBright : glow;
    const irisOutGlow = isIron ? irisOutBright : glow;
    const irisInLit = isIron ? lit * irisInStep : lit;
    const irisOutLit = isIron ? lit * irisOutStep : lit;

    const irisInnerExpand = isIron
      ? 1 + rawIronBreath * ringBreathExpand * irisInStep
      : 1;
    const irisOuterExpand = isIron
      ? 1 + rawIronBreath * ringBreathExpand * 1.15 * irisOutStep
      : 1;
    const r1 = r1Base * irisInnerExpand;
    const r2 = r2Base * irisOuterExpand;

    ctx.save();
    const ticks = 48;
    for (let i = 0; i < ticks; i++) {
      const ang = isIron
        ? (i / ticks) * Math.PI * 2 + 0.3
        : (i / ticks) * Math.PI * 2 - st.irisSpin * 0.7 + 0.3;
      const long = i % 4 === 0;
      const tickR = isIron ? r2 * (1 + rawIronBreath * ringBreathExpand * 0.35 * irisOutStep) : r2;
      const t0 = tickR + R * 0.04;
      const t1 = tickR + R * (long ? 0.13 : 0.08);
      const tickAlpha = isIron
        ? irisOutBright * (long ? 0.72 : 0.48)
        : (long ? 0.32 : 0.16) + glow * 0.18;
      ctx.beginPath();
      ctx.moveTo(ox + t0 * Math.cos(ang), oy + t0 * Math.sin(ang));
      ctx.lineTo(ox + t1 * Math.cos(ang), oy + t1 * Math.sin(ang));
      ctx.strokeStyle = rgba(
        isIron ? lerpColorHex(K.IRON_RIM, K.BRONZE_LT, ironHeat) : K.BRONZE_LT,
        tickAlpha,
      );
      ctx.lineWidth = long ? 1.2 : 0.7;
      ctx.stroke();
    }
    ctx.restore();

    const innerSpin = isIron ? 0 : st.irisSpin;
    const outerSpin = isIron ? 0 : -st.irisSpin * 0.7 + 0.3;
    irisRing(ctx, ox, oy, r1, 8, innerGap, innerSpin, Math.max(2, R * 0.055), irisInGlow, irisInLit, true);
    irisRing(
      ctx,
      ox,
      oy,
      r2,
      14,
      outerGap,
      outerSpin,
      Math.max(1, R * 0.024),
      irisOutGlow * 0.85,
      irisOutLit * 0.9,
      false,
    );
  }

  // 6. CORE BODY — blackbody radial gradient (white→amber→orange→red→iron).
  {
    ctx.save();
    if (glow > 0.05) {
      ctx.shadowColor = K.GOLD_BRT;
      ctx.shadowBlur = isIron
        ? (2 + ironHeat * 10) + glow * (4 + ironHeat * 14) + finishPow * (8 + ironHeat * 12)
        : 14 + glow * 36 + finishPow * 44;
    }
    const body = ctx.createRadialGradient(ox, oy, 0, ox, oy, R);
    if (st.status === "idle") {
      body.addColorStop(0, rgba(K.IRON_RIM, 0.95));
      body.addColorStop(0.5, rgba(K.IRON_MID, 0.98));
      body.addColorStop(1, rgba(K.IRON, 1));
    } else if (hot) {
      const h = clamp01(
        (ironBright.floor + (ironBright.peak - ironBright.floor) * glowBreathEnv) *
          (0.32 + ironHeat * 0.68) +
          finishPow * 0.55,
      );
      if (!isIron) {
        body.addColorStop(0, rgba(K.HOT_WHITE, h));
        body.addColorStop(0.22, rgba(K.WARM_WHITE, h * 0.92));
        body.addColorStop(0.42, rgba(K.GOLD_BRT, 0.95));
        body.addColorStop(0.62, rgba(K.AMBER, 0.88));
        body.addColorStop(0.80, rgba(K.GOLD, 0.8));
        body.addColorStop(0.92, rgba(K.EMBER_RED, 0.6));
      } else {
        const c0 = lerpColorHex(K.IRON_MID, K.WARM_WHITE, ironHeat);
        const c1 = lerpColorHex(K.IRON_RIM, K.GOLD_BRT, ironHeat);
        const c2 = lerpColorHex(K.BRONZE, K.GOLD, ironHeat);
        const c3 = lerpColorHex(K.IRON_RIM, K.AMBER, ironHeat * 0.85);
        body.addColorStop(0, rgba(c0, lerp(0.92, h * 0.42, ironHeat)));
        body.addColorStop(0.16, rgba(c1, lerp(0.35, h * 0.48, ironHeat)));
        body.addColorStop(0.38, rgba(c2, lerp(0.48, 0.68, ironHeat) * (0.55 + h * 0.45)));
        body.addColorStop(0.62, rgba(c3, lerp(0.72, 0.86, ironHeat)));
        body.addColorStop(0.82, rgba(K.IRON_RIM, lerp(0.96, 0.90, ironHeat)));
        body.addColorStop(0.94, rgba(K.IRON_MID, 0.97));
      }
      body.addColorStop(1, rgba(K.IRON, 1));
    } else if (st.status === "paused") {
      const f = 0.5 + 0.16 * Math.sin(st.t * 0.0031 + 1.1) * Math.sin(st.t * 0.0019);
      body.addColorStop(0, rgba(K.GOLD, 0.5 * f));
      body.addColorStop(0.5, rgba(K.BRONZE, 0.62 * f));
      body.addColorStop(1, rgba(K.IRON, 1));
    }
    ctx.beginPath();
    ctx.arc(ox, oy, R, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();

    // ── Internal detail, clipped to the core ──────────────────────────────────
    if (hot && !reduced) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ox, oy, R * 0.985, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";

      // 6a. Turbulence cells — depth-bright; follow global breath (rings carry the step pulse).
      const cells = isIron ? Math.max(2, Math.round(lerp(2, 5, ironHeat))) : 6;
      const cellBreathMod = isIron ? 0.68 + 0.32 * glowBreathEnv : 1;
      for (let i = 0; i < cells; i++) {
        const fx = ox + R * 0.42 * cellBreathMod * Math.sin(st.t * (0.00018 + i * 0.00004) + i * 1.7);
        const fy = oy + R * 0.42 * cellBreathMod * Math.cos(st.t * (0.00013 + i * 0.00005) + i * 2.3);
        const pr = R * (0.30 + 0.12 * Math.sin(st.t * 0.0006 + i)) * (isIron ? 0.82 + 0.22 * ironHeat : 1);
        const a = isIron
          ? glow * (0.04 + ironHeat * 0.14) * cellBreathMod
          : glow * 0.16;
        const pg = ctx.createRadialGradient(fx, fy, 0, fx, fy, pr);
        const cellHot = isIron ? lerpColorHex(K.BRONZE_LT, i % 2 ? K.AMBER : K.GOLD_BRT, ironHeat) : (i % 2 ? K.AMBER : K.GOLD_BRT);
        pg.addColorStop(0, rgba(cellHot, a));
        pg.addColorStop(1, rgba(K.AMBER, 0));
        ctx.beginPath();
        ctx.arc(fx, fy, pr, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      // 6b. Striation rings — step pulse inside→out, synced to breath cycle.
      for (let i = 1; i <= (isIron ? ironStriationCount : 5); i++) {
        const ringIdx = i - 1;
        const ringStep = isIron && !reduced
          ? ironRingStepPulse(ironCyclePhase, ringIdx, ironRingCount)
          : 1;
        const ringBright = isIron
          ? ironRingBright(ironHeat, glowBreathEnv, ringStep)
          : glow;
        const sr = R * (0.18 * i) *
          (isIron ? 1 + rawIronBreath * ringBreathExpand * 0.55 * ringStep : 1);
        const strAlpha = isIron
          ? ringBright * 0.62
          : glow * 0.07 * (Math.sin(st.t * 0.0009 + i * 1.3) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.arc(ox, oy, sr, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(
          isIron ? lerpColorHex(K.IRON_RIM, K.WARM_WHITE, ironHeat) : K.WARM_WHITE,
          strAlpha,
        );
        ctx.lineWidth = isIron ? 0.7 + ironHeat * 0.5 : 0.8;
        ctx.stroke();
      }

      // 6c. Granular magma cells — visible once core heats; global breath only.
      const grainVis = isIron ? ironHeat * (0.35 + 0.65 * glowBreathEnv) : 1;
      for (const gr of st.grains) {
        if (isIron && grainVis < 0.08) continue;
        const flick = isIron
          ? 0.4 + 0.6 * glowBreathEnv
          : 0.5 + 0.5 * Math.sin(st.t * 0.004 + gr.phase);
        const grainSpin = isIron ? 0 : st.t * 0.00008;
        const gx = ox + R * gr.r * Math.cos(gr.a + grainSpin);
        const gy = oy + R * gr.r * Math.sin(gr.a + grainSpin);
        const gsz = R * gr.size * (isIron ? 0.85 + 0.25 * grainVis : 1);
        const a = isIron
          ? glow * (0.02 + ironHeat * 0.10) * flick * (1 - gr.r * 0.6)
          : glow * 0.10 * flick * (1 - gr.r * 0.6);
        if (a < 0.01) continue;
        const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gsz);
        gg.addColorStop(0, rgba(
          isIron ? lerpColorHex(K.BRONZE_LT, K.WARM_WHITE, ironHeat) : K.HOT_WHITE,
          a,
        ));
        gg.addColorStop(1, rgba(K.GOLD_BRT, 0));
        ctx.beginPath();
        ctx.arc(gx, gy, gsz, 0, Math.PI * 2);
        ctx.fillStyle = gg;
        ctx.fill();
      }

      // 6d. Hot nucleus — core brightness grows with depth + breath.
      const nx = ox - R * 0.30, ny = oy - R * 0.26;
      const nucR = R * (
        (isIron ? 0.20 + ironHeat * 0.16 : 0.28) +
        (isIron ? 0.05 + ironHeat * 0.10 : 0.05) * (0.5 + 0.5 * rawIronBreath) * breathDepth
      );
      const nucAlpha = isIron
        ? (ironBright.floor + (ironBright.peak - ironBright.floor) * glowBreathEnv) * 0.55
        : glow * 0.26;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nucR);
      ng.addColorStop(0, rgba(
        isIron ? lerpColorHex(K.IRON_RIM, K.WARM_WHITE, ironHeat) : K.HOT_WHITE,
        nucAlpha,
      ));
      ng.addColorStop(1, rgba(isIron ? K.WARM_WHITE : K.HOT_WHITE, 0));
      ctx.beginPath();
      ctx.arc(nx, ny, nucR, 0, Math.PI * 2);
      ctx.fillStyle = ng;
      ctx.fill();

      ctx.restore();
    }

    // Hard containment rim.
    ctx.beginPath();
    ctx.arc(ox, oy, R, 0, Math.PI * 2);
  ctx.strokeStyle = isIron
    ? rgba(lerpColorHex(K.IRON_RIM, K.BRONZE_LT, ironHeat), 0.12 + glow * (0.10 + ironHeat * 0.16))
    : rgba(K.GOLD_BRT, 0.3 + glow * 0.5);
    ctx.lineWidth = 1 + glow * 0.8;
    ctx.stroke();

    // Readability well — dims centre blaze so overlay timer stays legible.
    if (hot) {
      const wellR = R * 0.52;
      const wg = ctx.createRadialGradient(ox, oy, 0, ox, oy, wellR);
      wg.addColorStop(0, rgba(K.IRON, 0.90));
      wg.addColorStop(0.32, rgba(K.IRON, 0.58));
      wg.addColorStop(0.65, rgba(K.IRON_MID, 0.20));
      wg.addColorStop(1, rgba(K.IRON, 0));
      ctx.beginPath();
      ctx.arc(ox, oy, wellR, 0, Math.PI * 2);
      ctx.fillStyle = wg;
      ctx.fill();
    }
  }

  // 7. CONFINEMENT ARCS.
  const showIronFinishEffects = finishPow > 0.03;
  if (!reduced && (!isIron || showIronFinishEffects)) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const arc of st.arcs) {
      const f = arc.age / arc.life;
      if (f >= 1) continue;
      const a = Math.sin(Math.PI * f) * (0.5 + glow * 0.5);
      if (a < 0.03) continue;
      const SEG = 7;
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const tt = i / SEG;
        const ang = arc.a0 + (arc.a1 - arc.a0) * tt;
        const bow = Math.sin(Math.PI * tt) * R * 0.55;
        const jit = Math.sin(tt * 9 + arc.seed) * R * 0.06 * (1 - f);
        const rr = R * 0.96 - bow + jit;
        const x = ox + rr * Math.cos(ang);
        const y = oy + rr * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(K.WARM_WHITE, a);
      ctx.lineWidth = 0.9;
      ctx.shadowColor = K.GOLD_BRT;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // 8. SPARKS with trails.
  if (!reduced && (!isIron || showIronFinishEffects)) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const sp of st.sparks) {
      const f = sp.age / sp.life;
      if (f >= 1) continue;
      const a = (1 - f) * 0.9;
      ctx.beginPath();
      ctx.moveTo(ox + sp.px, oy + sp.py);
      ctx.lineTo(ox + sp.x, oy + sp.y);
      ctx.strokeStyle = rgba(K.WARM_WHITE, a);
      ctx.lineWidth = sp.size * (1 - f * 0.5);
      ctx.shadowColor = K.GOLD_BRT;
      ctx.shadowBlur = 4;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();

  // ── 9. BLOOM — downscale + blur (skip idle — blurring empty canvas leaves a grey box).
  if ((glow > 0.12 || finishPow > 0.02) && st.status !== "idle") {
    const gw = glowCtx.canvas.width;
    const gh = glowCtx.canvas.height;
    glowCtx.setTransform(1, 0, 0, 1, 0, 0);
    glowCtx.clearRect(0, 0, gw, gh);
    glowCtx.filter = "blur(2px)";
    glowCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, gw, gh);
    glowCtx.filter = "none";

    // Mask bloom to a soft circle so square buffer edges never leak.
    if (ambient) {
      glowCtx.globalCompositeOperation = "destination-in";
      const gcx = gw / 2;
      const gcy = gh / 2;
      const gOuter = Math.hypot(gcx, gcy) * 1.02;
      const gg = glowCtx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gOuter);
      gg.addColorStop(0, "rgba(255,255,255,1)");
      gg.addColorStop(0.46, "rgba(255,255,255,1)");
      gg.addColorStop(0.68, "rgba(255,255,255,0)");
      gg.addColorStop(1, "rgba(255,255,255,0)");
      glowCtx.fillStyle = gg;
      glowCtx.fillRect(0, 0, gw, gh);
      glowCtx.globalCompositeOperation = "source-over";
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = isIron
      ? (0.10 + ironHeat * 0.22) * glowBreathEnv *
          (isIron && !reduced
            ? ironRingStepPulse(ironCyclePhase, ironRingCount - 1, ironRingCount)
            : 1) +
        finishPow * 0.10
      : 0.55 + Math.min(0.35, glow * 0.3) + finishPow * 0.3;
    ctx.drawImage(glowCtx.canvas, 0, 0, gw, gh, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── 10. FILM GRAIN (subtle, jittered tile) ───────────────────────────────────
  if (!isIron && grainPattern && hot) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.05 + glow * 0.04;
    const jx2 = (Math.random() * 64) | 0;
    const jy2 = (Math.random() * 64) | 0;
    ctx.translate(-jx2, -jy2);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, cssW + 64, cssH + 64);
    ctx.restore();
  }

  // ── 11. Edge mask — full-rect fade; ambient stops well inside wrapper bounds.
  {
    const outerR = Math.hypot(cx, cy) * 1.02;
    const solidStop = ambient ? 0.32 : 0.78;
    const fadeStop = ambient ? 0.52 : 0.9;
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    const mg = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
    mg.addColorStop(0, "rgba(255,255,255,1)");
    mg.addColorStop(solidStop, "rgba(255,255,255,1)");
    mg.addColorStop(fadeStop, "rgba(255,255,255,0)");
    mg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────────

export const ReactorCore: FC<ReactorCoreProps> = ({
  mode,
  isRunning,
  elapsedSeconds,
  targetSeconds,
  displayTime,
  className = "relative h-72 w-72",
  ambient = false,
  showTimer = true,
  visualStyle = "reactor",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({ mode, isRunning, elapsedSeconds, targetSeconds, ambient, visualStyle });
  useEffect(() => {
    propsRef.current = { mode, isRunning, elapsedSeconds, targetSeconds, ambient, visualStyle };
  });

  const animRef = useRef<{
    state: CanvasState | null;
    raf: number | null;
    lastTs: number | null;
    dpr: number;
    cssW: number;
    cssH: number;
    glow: HTMLCanvasElement | null;
    grainPattern: CanvasPattern | null;
  }>({
    state: null,
    raf: null,
    lastTs: null,
    dpr: 1,
    cssW: 288,
    cssH: 288,
    glow: null,
    grainPattern: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctxOrNull = canvas.getContext("2d", { alpha: true });
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    const anim = animRef.current;

    // Offscreen bloom buffer.
    const glow = document.createElement("canvas");
    const glowCtx = glow.getContext("2d")!;
    anim.glow = glow;

    // Film-grain tile (built once).
    const grainTile = document.createElement("canvas");
    grainTile.width = 64;
    grainTile.height = 64;
    const gtx = grainTile.getContext("2d")!;
    const img = gtx.createImageData(64, 64);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gtx.putImageData(img, 0, 0);
    anim.grainPattern = ctx.createPattern(grainTile, "repeat");

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reduceMq.matches;
    const onReduce = (e: MediaQueryListEvent) => { reduced = e.matches; };
    reduceMq.addEventListener("change", onReduce);

    function applySize() {
      const el = wrapper!;
      const dpr = window.devicePixelRatio || 1;
      const size = Math.max(el.offsetWidth, el.offsetHeight, 1);
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      anim.cssW = size;
      anim.cssH = size;
      anim.dpr = dpr;
      glow.width = Math.max(1, Math.round(canvas!.width * GLOW_SCALE));
      glow.height = Math.max(1, Math.round(canvas!.height * GLOW_SCALE));
    }

    applySize();

    anim.state = {
      t: 0,
      status: "idle",
      prevStatus: "idle",
      progress: 0,
      depthParam: 0,
      jitterT: 0,
      coreScale: 0.20,
      irisSpin: 0,
      bloomT: 0,
      finishT: 0,
      shockTimer: 0,
      arcTimer: 0,
      sparkTimer: 0,
      shocks: [],
      arcs: [],
      sparks: [],
      grains: mkGrains(),
    };

    const ro = new ResizeObserver(applySize);
    ro.observe(wrapper);

    function spawnShock(st: CanvasState, power: number) {
      st.shocks.push({ age: 0, life: SHOCK_LIFE, power });
      if (st.shocks.length > 6) st.shocks.shift();
    }
    function spawnArc(st: CanvasState) {
      const a0 = Math.random() * Math.PI * 2;
      const a1 = a0 + (Math.PI * 0.5 + Math.random() * Math.PI);
      st.arcs.push({ age: 0, life: ARC_LIFE, a0, a1, seed: Math.random() * 6.28 });
      if (st.arcs.length > 5) st.arcs.shift();
    }
    function spawnSpark(st: CanvasState, R: number) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.02 + Math.random() * 0.05);
      const x = R * Math.cos(ang);
      const y = R * Math.sin(ang);
      st.sparks.push({
        x, y, px: x, py: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 0.015, // slight buoyant rise
        age: 0,
        life: 600 + Math.random() * 700,
        size: 0.7 + Math.random() * 1.2,
      });
      if (st.sparks.length > 40) st.sparks.shift();
    }
    function spawnFinishBurst(st: CanvasState, R: number) {
      spawnArc(st);
      for (let i = 0; i < 4; i += 1) {
        spawnSpark(st, R * (0.85 + Math.random() * 0.5));
      }
    }

    function frame(ts: number) {
      const dt = anim.lastTs !== null ? Math.min(ts - anim.lastTs, 50) : 16;
      anim.lastTs = ts;

      const { mode: m, isRunning: ir, elapsedSeconds: es, targetSeconds: tg } =
        propsRef.current;
      const st = anim.state!;
      const maxR = Math.min(anim.cssW, anim.cssH) / 2;
      const isIron = propsRef.current.visualStyle === "iron";

      const newStatus = deriveStatus(m, ir, es, tg);
      const newProgress =
        m === "focus" && tg !== null && tg > 0 ? Math.min(1, es / tg) : 0;

      const MAX_S = 180 * 60;
      let depthParam = 0;
      if (m === "focus" && tg !== null) {
        const depthScale = Math.min(tg / MAX_S, 1.0);
        depthParam = Math.min(newProgress * (0.55 + depthScale * 0.45) + depthScale * 0.12, 1.0);
      } else if (m === "stopwatch") {
        depthParam = Math.min(es / MAX_S, 1.0);
      }

      st.prevStatus = st.status;
      st.status = newStatus;
      st.progress = newProgress;
      st.depthParam = depthParam;
      st.t += dt;

      st.jitterT = newStatus === "paused" ? st.jitterT + dt : 0;

      const depthGrowth = newStatus === "running" ? st.depthParam : 0;
      const scaleTarget = newStatus === "idle" ? 0.20 : 0.84 + depthGrowth * 0.38;
      const scaleLerp =
        newStatus === "idle" ? Math.min(dt * 0.0018, 1) : Math.min(dt * 0.0030, 1);
      st.coreScale = lerp(st.coreScale, scaleTarget, scaleLerp);

      const irisSpeed = isIron
        ? 0
        : newStatus === "running"
          ? 0.00018 + depthParam * 0.00022
          : newStatus === "finished"
            ? 0.00010
            : newStatus === "idle"
              ? 0.00005
              : 0;
      st.irisSpin += irisSpeed * dt;

      if (st.prevStatus === "idle" && st.status === "running") {
        st.bloomT = BLOOM_MS;
        spawnShock(st, 1.0);
      }
      if (st.bloomT > 0) st.bloomT -= dt;

      if (st.prevStatus !== "finished" && st.status === "finished") {
        st.finishT = FINISH_MS;
        spawnShock(st, 1.2);
        if (isIron && !reduced) spawnFinishBurst(st, maxR * 0.26 * st.coreScale);
      }
      if (
        st.status === "idle" &&
        (st.prevStatus === "running" || st.prevStatus === "paused" || st.prevStatus === "finished")
      ) {
        st.finishT = FINISH_MS;
        spawnShock(st, 1.2);
        if (isIron && !reduced) spawnFinishBurst(st, maxR * 0.26 * st.coreScale);
      }
      if (st.finishT > 0) st.finishT -= dt;

      const curR = maxR * 0.26 * st.coreScale;
      if (newStatus === "running" && !reduced) {
        st.shockTimer -= dt;
        if (st.shockTimer <= 0) {
          if (isIron && depthParam < 0.35) {
            st.shockTimer = 900;
          } else {
            spawnShock(st, 0.5 + depthParam * 0.4);
            st.shockTimer = isIron
              ? 6200 - depthParam * 2000
              : 3600 - depthParam * 1200;
          }
        }
        if (!isIron) {
          st.arcTimer -= dt;
          if (st.arcTimer <= 0) {
            spawnArc(st);
            st.arcTimer = 220 + Math.random() * 480;
          }
          st.sparkTimer -= dt;
          if (st.sparkTimer <= 0) {
            spawnSpark(st, curR);
            st.sparkTimer = 90 + Math.random() * 160 - depthParam * 50;
          }
        }
      }

      for (const s of st.shocks) s.age += dt;
      for (const a of st.arcs) a.age += dt;
      for (const sp of st.sparks) {
        sp.px = sp.x; sp.py = sp.y;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy -= 0.00002 * dt; // continued buoyancy
        sp.age += dt;
      }
      st.shocks = st.shocks.filter((s) => s.age < s.life);
      st.arcs = st.arcs.filter((a) => a.age < a.life);
      st.sparks = st.sparks.filter((sp) => sp.age < sp.life);

      ctx.setTransform(anim.dpr, 0, 0, anim.dpr, 0, 0);
      draw(
        ctx,
        glowCtx,
        anim.grainPattern,
        anim.cssW,
        anim.cssH,
        anim.dpr,
        st,
        propsRef.current.ambient,
        reduced,
        propsRef.current.visualStyle,
      );

      anim.raf = requestAnimationFrame(frame);
    }

    anim.raf = requestAnimationFrame(frame);

    return () => {
      if (anim.raf !== null) {
        cancelAnimationFrame(anim.raf);
        anim.raf = null;
      }
      anim.lastTs = null;
      ro.disconnect();
      reduceMq.removeEventListener("change", onReduce);
    };
  }, []);

  return (
    <div ref={wrapperRef} className={className}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full bg-transparent"
        aria-hidden
      />
      {showTimer && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
          aria-label={`Timer: ${displayTime}`}
        >
          <span className={ACCENT_TIMER_OVERLAY}>
            {displayTime}
          </span>
        </div>
      )}
    </div>
  );
};
