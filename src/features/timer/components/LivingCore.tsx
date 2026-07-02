import { useRef, useEffect, type FC } from "react";
import { ACCENT_TIMER_OVERLAY } from "../../../lib/accentStyles";
import type { TimerMode } from "../../../types/models";

// ── Public API ─────────────────────────────────────────────────────────────────

export interface LivingCoreProps {
  mode: TimerMode;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  /** Formatted display string, e.g. "01:30:00" */
  displayTime: string;
  /** Tailwind classes for the wrapper. Controls visual size. */
  className?: string;
  /** Full-bleed ambient layer: soft edge fade, no circular clip, grows with session depth. */
  ambient?: boolean;
  /** When false, timer digits are omitted (parent renders them in the UI stack). */
  showTimer?: boolean;
}

// ── Internal types ─────────────────────────────────────────────────────────────

type CoreStatus = "idle" | "running" | "paused" | "finished";

interface Particle {
  angle: number;    // orbit angle (rad)
  orbitR: number;   // orbit radius (CSS px)
  speed: number;    // angular speed (rad/ms), signed
  size: number;     // dot radius (CSS px)
  baseAlpha: number;
  phase: number;    // shimmer phase offset (rad)
}

interface Ring {
  angle: number;        // current rotation (rad)
  speed: number;        // rad/ms
  dir: 1 | -1;
  /** Slow envelope: modulates how much THIS ring responds to the shared breath signal.
   *  Varies between ~0.25 and 1.0 on its own slow cycle, making ring spacing change
   *  every breath without the rings ever fully decoupling from inhale/exhale. */
  ampModPhase: number;  // initial phase of the amplitude-envelope oscillator
  ampModFreq: number;   // frequency (rad/ms) of the amplitude envelope — all distinct
}

interface CanvasState {
  t: number;
  status: CoreStatus;
  progress: number;
  depthParam: number;
  particles: Particle[];
  rings: Ring[];
  jitterT: number;
  burstT: number;
  prevStatus: CoreStatus;
  /** Lerped global scale for the core orb: idle → 0.20, running → 1.0. */
  coreScale: number;
  /** Lerped scale applied only to rings + particle orbits.
   *  idle → 0.12 (rings hug the core), bursts to 1.08 on start, settles to 1.0. */
  ringScale: number;
  /** Countdown (ms) for the ring burst overshoot phase after idle → running. */
  ringBurstT: number;
  /** Countdown (ms) for the finish explosion (running/paused → finished). */
  finishBurstT: number;
}

// ── Palette (dark iron / bronze / molten gold) ─────────────────────────────────

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
} as const;

// ── Utilities ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
}

function deriveStatus(
  mode: TimerMode,
  isRunning: boolean,
  elapsedSeconds: number,
  targetSeconds: number | null,
): CoreStatus {
  if (mode === "idle") return "idle";
  if (isRunning) return "running";
  if (
    mode === "focus" &&
    targetSeconds !== null &&
    elapsedSeconds >= targetSeconds
  )
    return "finished";
  return "paused";
}

function mkParticles(maxR: number): Particle[] {
  return Array.from({ length: 28 }, (_, i) => ({
    angle: (i / 28) * Math.PI * 2 + Math.random() * 0.4,
    orbitR: maxR * (0.28 + Math.random() * 0.3),
    speed: (0.00022 + Math.random() * 0.00035) * (i % 2 === 0 ? 1 : -1),
    size: 0.8 + Math.random() * 1.3,
    baseAlpha: 0.18 + Math.random() * 0.32,
    phase: Math.random() * Math.PI * 2,
  }));
}

function mkRings(): Ring[] {
  return [
    // Outer  — slowest rotation, amp envelope period ~47 s
    { angle: 0,           speed: 0.000165, dir: -1, ampModPhase: 0,              ampModFreq: 0.000132 },
    // Mid    — medium rotation, amp envelope period ~71 s
    { angle: Math.PI / 4, speed: 0.000238, dir:  1, ampModPhase: Math.PI * 0.73, ampModFreq: 0.000088 },
    // Inner  — fastest rotation, amp envelope period ~58 s
    { angle: Math.PI / 3, speed: 0.000295, dir: -1, ampModPhase: Math.PI * 1.51, ampModFreq: 0.000109 },
  ];
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  angle: number,
  lw: number,
  ticks: number,
  ringColor: string,
  glowColor: string,
  glowAlpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = lw;
  if (glowAlpha > 0.02) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 5 * glowAlpha;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  const majorEvery = ticks / 4;
  for (let i = 0; i < ticks; i++) {
    const ta = (i / ticks) * Math.PI * 2;
    const cosA = Math.cos(ta);
    const sinA = Math.sin(ta);
    const isMajor = i % majorEvery === 0;
    const tickLen = r * (isMajor ? 0.075 : 0.038);
    const tickAlpha = isMajor
      ? 0.62 + glowAlpha * 0.3
      : 0.2 + glowAlpha * 0.14;

    ctx.beginPath();
    ctx.moveTo((r - tickLen) * cosA, (r - tickLen) * sinA);
    ctx.lineTo(r * cosA, r * sinA);
    ctx.strokeStyle = isMajor
      ? rgba(K.BRONZE_LT, tickAlpha)
      : rgba(K.BRONZE, tickAlpha * 0.65);
    ctx.lineWidth = isMajor ? 1.1 : 0.5;
    if (isMajor && glowAlpha > 0.05) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 3;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawConnectors(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  baseAngle: number,
  count: number,
  alpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(baseAngle);

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const midR = (innerR + outerR) * 0.5;
    const bow = midR * 0.07;
    const perpA = a + Math.PI / 2;
    const cpx = midR * Math.cos(a) + bow * Math.cos(perpA);
    const cpy = midR * Math.sin(a) + bow * Math.sin(perpA);

    ctx.beginPath();
    ctx.moveTo(innerR * Math.cos(a), innerR * Math.sin(a));
    ctx.quadraticCurveTo(cpx, cpy, outerR * Math.cos(a), outerR * Math.sin(a));
    ctx.strokeStyle = rgba(K.BRONZE, alpha * 0.52);
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }

  ctx.restore();
}

function drawCore(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  glowIntensity: number,
  status: CoreStatus,
  t: number,
) {
  ctx.save();

  // Outer aura – bleeds outward on exhale
  if (glowIntensity > 0.02) {
    const auraR = r + r * (0.55 + glowIntensity * 1.85);
    const g = ctx.createRadialGradient(cx, cy, r * 0.22, cx, cy, auraR);
    g.addColorStop(0, rgba(K.GOLD, glowIntensity * 0.62));
    g.addColorStop(0.38, rgba(K.GOLD, glowIntensity * 0.18));
    g.addColorStop(1, rgba(K.GOLD, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Core body fill – radial gradient, off-center for depth
  const bx = cx - r * 0.22;
  const by = cy - r * 0.22;
  const bodyG = ctx.createRadialGradient(bx, by, 0, cx, cy, r);

  if (status === "idle") {
    bodyG.addColorStop(0, rgba(K.IRON_RIM, 0.92));
    bodyG.addColorStop(0.55, rgba(K.IRON_MID, 0.97));
    bodyG.addColorStop(1, rgba(K.IRON, 1));
  } else if (status === "running") {
    const b = 0.32 + glowIntensity * 0.62;
    bodyG.addColorStop(0, rgba(K.WARM_WHITE, 0.8 * b));
    bodyG.addColorStop(0.22, rgba(K.GOLD_BRT, 0.76 * b));
    bodyG.addColorStop(0.55, rgba(K.GOLD, 0.72));
    bodyG.addColorStop(1, rgba(K.IRON, 1));
  } else if (status === "paused") {
    // Dual-frequency flicker for irregular "suspended" feel
    const f = 0.5 + 0.16 * Math.sin(t * 0.0031 + 1.1) * Math.sin(t * 0.0019);
    bodyG.addColorStop(0, rgba(K.GOLD, 0.46 * f));
    bodyG.addColorStop(0.5, rgba(K.BRONZE, 0.6 * f));
    bodyG.addColorStop(1, rgba(K.IRON, 1));
  } else {
    // finished – steady slow pulse
    const pulse = 0.62 + 0.38 * Math.sin(t * 0.00185);
    bodyG.addColorStop(0, rgba(K.WARM_WHITE, pulse));
    bodyG.addColorStop(0.28, rgba(K.GOLD_BRT, pulse * 0.92));
    bodyG.addColorStop(0.65, rgba(K.GOLD, 0.82));
    bodyG.addColorStop(1, rgba(K.IRON, 1));
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (glowIntensity > 0.04) {
    ctx.shadowColor = K.GOLD_BRT;
    ctx.shadowBlur = 10 + glowIntensity * 30;
  }
  ctx.fillStyle = bodyG;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Metallic rim
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(K.BRONZE_LT, 0.28 + glowIntensity * 0.5);
  ctx.lineWidth = 0.85;
  if (glowIntensity > 0.1) {
    ctx.shadowColor = K.GOLD;
    ctx.shadowBlur = 5;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Specular highlight – top-left
  if (status !== "idle") {
    const hlR = r * 0.18;
    const hlX = cx - r * 0.28;
    const hlY = cy - r * 0.28;
    const hlG = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
    hlG.addColorStop(0, rgba(K.WARM_WHITE, 0.6));
    hlG.addColorStop(1, rgba(K.WARM_WHITE, 0));
    ctx.beginPath();
    ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
    ctx.fillStyle = hlG;
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  particles: Particle[],
  t: number,
  status: CoreStatus,
  glowIntensity: number,
  breathSignal: number,
  orbitExpand: number,
  ringScale: number,
  ringBurstFrac: number,    // 1→0 during start burst
  finishBurstFrac: number,  // 1→0 during finish explosion
) {
  const speedMult =
    status === "running" ? 1.6 : status === "idle" ? 0.28 : 0.04;

  // Start burst: quadratic decay, particles spray outward fast then settle.
  const scatterFrac = ringBurstFrac * ringBurstFrac;
  // Finish explosion: cubic decay — concentrated snap, fades fast.
  const finishScatterFrac = finishBurstFrac * finishBurstFrac * finishBurstFrac;

  // Alpha surges: start burst up to 7×, finish explosion up to 12×.
  const burstAlphaBoost = 1.0 + scatterFrac * 6.0 + finishScatterFrac * 11.0;

  // On inhale, alpha surges up to 1.5×, revealing dim particles.
  const inhaleBoost = status === "running"
    ? 0.48 + 1.02 * (0.5 + 0.5 * breathSignal)  // [0.48, 1.50]
    : 1.0;
  const alphaMult =
    (status === "running" ? 1.0 : status === "idle" ? 0.28 : 0.1) * inhaleBoost * burstAlphaBoost;

  for (const p of particles) {
    const angle = p.angle + p.speed * t * speedMult;
    const shimmer = 0.68 + 0.32 * Math.sin(t * 0.0019 + p.phase);
    const a = p.baseAlpha * alphaMult * shimmer;
    // Lower visibility cutoff during burst so dim particles also surface.
    const cutoff = scatterFrac > 0.05 ? 0.002 : 0.007;
    if (a < cutoff) continue;

    // Per-particle amplitude envelope for breathing (slow, range [0.28, 1.0]).
    const particleEnv = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * 0.000095 + p.phase * 2.3));
    // Per-particle scatter distance: varies so particles fly to different radii.
    // Start scatter (fast) + finish scatter (slow, larger range)
    const perParticleVar = 0.3 + 0.7 * Math.abs(Math.sin(p.phase * 2.7));
    const particleScatter =
      scatterFrac       * 1.4 * perParticleVar +
      finishScatterFrac * 4.2 * perParticleVar;
    const effectiveOrbitR = p.orbitR * (ringScale * (1 + breathSignal * orbitExpand * particleEnv) + particleScatter);

    const x = cx + effectiveOrbitR * Math.cos(angle);
    const y = cy + effectiveOrbitR * Math.sin(angle);

    ctx.save();
    if (glowIntensity > 0.12) {
      ctx.shadowColor = K.AMBER;
      ctx.shadowBlur = 3.5 * glowIntensity;
    }
    ctx.beginPath();
    ctx.arc(x, y, p.size * (0.78 + 0.22 * shimmer), 0, Math.PI * 2);
    ctx.fillStyle = rgba(K.AMBER, a);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Fragment shards ────────────────────────────────────────────────────────────

/**
 * Draws glowing core shards that fly outward during the finish explosion.
 * Each shard is a small gold orb that starts at the core position and
 * travels radially outward, shrinking and fading as finishBurstFrac → 0.
 */
function drawFragmentShards(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  coreBaseR: number,
  maxR: number,
  finishBurstFrac: number,
): void {
  if (finishBurstFrac < 0.02) return;

  const COUNT = 16;
  // Travel distance: 0 at burst start → maxR×0.82 as burst fades (flies much further)
  const travel = (1 - finishBurstFrac) * maxR * 0.82;
  // Shard radius: starts larger (~45% of core), shrinks to nothing
  const shardR = coreBaseR * 0.48 * finishBurstFrac;
  // Alpha: blindingly bright at start, fades fast
  const shardAlpha = finishBurstFrac * finishBurstFrac * (0.75 + 0.25 * finishBurstFrac);

  for (let i = 0; i < COUNT; i++) {
    // Evenly spaced angles with a golden-ratio offset for irregular feel
    const angle = (i / COUNT) * Math.PI * 2 + (i % 3) * 0.41;
    // Per-shard distance variation via golden ratio sequence
    const distMult = 0.55 + 0.45 * ((i * 0.6180339) % 1.0);
    const dist = travel * distMult;
    const x = cx + dist * Math.cos(angle);
    const y = cy + dist * Math.sin(angle);

    if (shardR < 0.5) continue;

    const g = ctx.createRadialGradient(
      x - shardR * 0.22, y - shardR * 0.22, 0,
      x, y, shardR,
    );
    g.addColorStop(0,   rgba(K.WARM_WHITE, shardAlpha * 0.90));
    g.addColorStop(0.35, rgba(K.GOLD_BRT,  shardAlpha * 0.75));
    g.addColorStop(1,   rgba(K.GOLD,       0));

    ctx.save();
    if (shardAlpha > 0.08) {
      ctx.shadowColor = K.GOLD_BRT;
      ctx.shadowBlur = 18 * shardAlpha;
    }
    ctx.beginPath();
    ctx.arc(x, y, shardR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Master draw function ───────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  st: CanvasState,
  ambient: boolean,
) {
  const cx = cssW / 2;
  const cy = cssH / 2;
  const maxR = Math.min(cssW, cssH) / 2;

  // ── Ring radii: breath-coupled with per-ring amplitude envelopes ─────────────
  //
  // All rings share the same breath signal (inhale → expand, exhale → contract)
  // but each ring's *response amplitude* drifts independently on a slow envelope.
  // Because the three envelope periods are mutually incommensurable (~47 / 71 / 58 s),
  // the spacing between rings changes organically every breath cycle.
  //
  //   r_i = baseR_i × (1 + breathSignal × baseExpand × ampEnv_i)
  //
  // ampEnv_i ∈ [0.25, 1.0] — how strongly ring i responds to the current breath.

  // Breath signal: same frequency formula as the core orb so rings move with it.
  const breathFreqRings =
    st.status === "running" ? 0.00065 - st.depthParam * 0.00035
    : 0.000175; // idle / other: very slow baseline
  const breathSignal = Math.sin(st.t * breathFreqRings); // −1 = exhale, +1 = inhale

  const baseExpand =
    st.status === "running"  ? 0.11 + st.depthParam * 0.09 :
    st.status === "finished" ? 0.10 :
    st.status === "paused"   ? 0.018 :
    0.06;                              // idle

  // Base fractions chosen so that at maximum expansion (baseExpand=0.26, env=1.0)
  // the outer ring reaches ≈0.97 × maxR — filling the canvas without clipping.
  //   outerFrac × (1 + 0.26) = 0.97  →  outerFrac ≈ 0.77
  // Finish explosion: cubic decay over 1400 ms — aggressive shockwave.
  const finishBurstFrac = Math.max(0, st.finishBurstT / 1400);
  const finishRingBoost = finishBurstFrac * finishBurstFrac * 1.30; // [0, +130%] at peak
  const effectiveRingScale = st.ringScale * (1 + finishRingBoost);
  const baseRadii = [maxR * 0.77 * effectiveRingScale, maxR * 0.635 * effectiveRingScale, maxR * 0.51 * effectiveRingScale] as const;
  const [rOuter, rMid, rInner] = baseRadii.map((base, i) => {
    // Amplitude envelope per ring: range [0.65, 1.0].
    // Floor at 0.65 ensures every ring always breathes visibly (≥65 % of baseExpand),
    // while the slow drift still causes spacing variation each cycle.
    const env = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(
      st.t * st.rings[i].ampModFreq + st.rings[i].ampModPhase,
    ));
    return base * (1 + breathSignal * baseExpand * env);
  }) as [number, number, number];

  // ── Breathing / state math ────────────────────────────────────────────────

  const coreBaseR = maxR * 0.235 * st.coreScale;
  let coreR = coreBaseR;
  let glowIntensity = 0;
  let jitterX = 0;
  let jitterY = 0;

  if (st.status === "running") {
    const d = st.depthParam; // 0..1 — encodes both progress and session weight
    // Frequency: ~9.7 s period at d=0 → ~20.9 s at d=1 (starts present, deepens)
    const freqMs = 0.00065 - d * 0.00035;
    // Amplitude: 14% of core radius at d=0 → 38% at d=1
    const ampFrac = 0.14 + d * 0.24;
    const breathVal = Math.sin(st.t * freqMs);
    coreR = coreBaseR + breathVal * (coreBaseR * ampFrac);
    // Glow stays alive across the full breath cycle — never drops to zero.
    // Maps [-1,1] → [0.18, 1.0] so exhale is dim but continuous, not a flash.
    const glowEnv = 0.18 + 0.82 * (0.5 + 0.5 * breathVal);
    glowIntensity = glowEnv * (0.36 + d * 0.44);
  } else if (st.status === "idle") {
    const breathVal = Math.sin(st.t * 0.000175);
    coreR = coreBaseR * (1 + breathVal * 0.028);
    glowIntensity = 0.018 + 0.022 * (0.5 + 0.5 * breathVal);
  } else if (st.status === "paused") {
    // Frozen breath + irregular positional jitter
    const jt = st.jitterT;
    const jAmt = coreBaseR * 0.018;
    jitterX = Math.sin(jt * 0.0148) * Math.sin(jt * 0.0213) * jAmt;
    jitterY = Math.cos(jt * 0.0182) * Math.sin(jt * 0.0097) * jAmt;
    glowIntensity = 0.13 + 0.04 * Math.sin(jt * 0.003);
  } else {
    // finished: settle into slow pulse
    const burstFade = Math.max(0, 1 - st.burstT / 1800);
    const pulse = 0.58 + 0.38 * Math.sin(st.t * 0.00185);
    glowIntensity = pulse * 0.68 + burstFade * 0.3;
    coreR =
      coreBaseR +
      burstFade * coreBaseR * 0.12 +
      Math.sin(st.t * 0.00185) * coreBaseR * 0.038;
  }

  // ── Finish burst flash — applied universally after the status block ────────────
  // This ensures the explosion is visible whether the trigger was a natural
  // completion (→ finished), a reset, or a log save (→ idle).
  if (finishBurstFrac > 0) {
    const flash = finishBurstFrac * finishBurstFrac * finishBurstFrac; // cubic — sharp snap
    glowIntensity = Math.min(1.8, glowIntensity + flash * 2.8);
    coreR += flash * coreBaseR * 0.70;
  }

  const rga = glowIntensity * 0.82; // ring glow alpha (slightly attenuated)

  // ── Lissajous centre drift ─────────────────────────────────────────────────
  // Two irrational frequencies on X/Y produce a path that never exactly repeats.
  // Active only while running or finished so idle/paused remain visually calm.
  const driftActive = st.status === "running" || st.status === "finished" || finishBurstFrac > 0.05;
  const driftAmt    = driftActive ? maxR * 0.030 : 0;
  const lissX = driftAmt * Math.sin(st.t * 0.00031);
  const lissY = driftAmt * Math.cos(st.t * 0.00023);

  // ── Paint layers back → front ─────────────────────────────────────────────

  // 1. Connector spokes: outer ↔ mid, mid ↔ inner
  drawConnectors(ctx, cx, cy, rMid, rOuter, st.rings[0].angle, 8, 0.35 + rga * 0.28);
  drawConnectors(ctx, cx, cy, rInner, rMid,  st.rings[1].angle, 4, 0.28 + rga * 0.22);

  // 2. Rings outer → inner
  drawRing(
    ctx, cx, cy, rOuter, st.rings[0].angle, 0.6, 36,
    rgba(K.IRON_RIM, 0.52 + rga * 0.28), K.GOLD, rga * 0.55,
  );
  drawRing(
    ctx, cx, cy, rMid, st.rings[1].angle, 0.9, 24,
    rgba(K.IRON_RIM, 0.45 + rga * 0.3), K.GOLD, rga * 0.7,
  );
  drawRing(
    ctx, cx, cy, rInner, st.rings[2].angle, 0.5, 12,
    rgba(K.IRON_RIM, 0.4 + rga * 0.32), K.GOLD, rga * 0.88,
  );

  // 3. Particles — orbit radii scale with rings and breathe at 65 % of ring amplitude.
  // ringBurstFrac (1→0 during burst) drives scatter + alpha surge.
  const ringBurstFrac = Math.max(0, st.ringBurstT / 520);
  drawParticles(ctx, cx, cy, st.particles, st.t, st.status, glowIntensity, breathSignal, baseExpand * 0.65, st.ringScale, ringBurstFrac, finishBurstFrac);

  // 4. Core orb — paused jitter + Lissajous drift
  drawCore(ctx, cx + jitterX + lissX, cy + jitterY + lissY, coreR, glowIntensity, st.status, st.t);

  // 5. Fragment shards — fly outward from core during finish explosion
  if (finishBurstFrac > 0.02) {
    drawFragmentShards(ctx, cx + lissX, cy + lissY, coreBaseR, maxR, finishBurstFrac);
  }

  // Ambient mode: very soft edge fade so bursts don't show a hard square canvas edge.
  if (ambient) {
    const outerR = Math.hypot(cx, cy) * 1.02;
    const vg = ctx.createRadialGradient(cx, cy, maxR * 0.94, cx, cy, outerR);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.96, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.globalCompositeOperation = "source-over";
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const LivingCore: FC<LivingCoreProps> = ({
  mode,
  isRunning,
  elapsedSeconds,
  targetSeconds,
  displayTime,
  className = "relative h-72 w-72",
  ambient = false,
  showTimer = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Live props ref: read inside RAF loop to avoid stale closure
  const propsRef = useRef({ mode, isRunning, elapsedSeconds, targetSeconds, ambient });
  useEffect(() => {
    propsRef.current = { mode, isRunning, elapsedSeconds, targetSeconds, ambient };
  });

  // Mutable animation state lives outside React to avoid re-renders
  const animRef = useRef<{
    state: CanvasState | null;
    raf: number | null;
    lastTs: number | null;
    dpr: number;
    cssW: number;
    cssH: number;
  }>({
    state: null,
    raf: null,
    lastTs: null,
    dpr: 1,
    cssW: 288,
    cssH: 288,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    // Assign to a `const` so TypeScript preserves non-null narrowing in nested functions
    const ctx = ctxOrNull;

    const anim = animRef.current;

    function applySize() {
      const el = wrapper!;
      const dpr = window.devicePixelRatio || 1;
      const size = Math.max(el.offsetWidth, el.offsetHeight, 1);
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      anim.cssW = size;
      anim.cssH = size;
      anim.dpr = dpr;
      if (anim.state) {
        anim.state.particles = mkParticles(size / 2);
      }
    }

    applySize();

    anim.state = {
      t: 0,
      status: "idle",
      progress: 0,
      depthParam: 0,
      particles: mkParticles(anim.cssW / 2),
      rings: mkRings(),
      jitterT: 0,
      burstT: 0,
      prevStatus: "idle",
      coreScale: 0.20,
      ringScale: 0.12,
      ringBurstT: 0,
      finishBurstT: 0,
    };

    const ro = new ResizeObserver(applySize);
    ro.observe(wrapper);

    function frame(ts: number) {
      const dt = anim.lastTs !== null ? Math.min(ts - anim.lastTs, 50) : 16;
      anim.lastTs = ts;

      const { mode: m, isRunning: ir, elapsedSeconds: es, targetSeconds: tg } =
        propsRef.current;
      const st = anim.state!;

      const newStatus = deriveStatus(m, ir, es, tg);
      const newProgress =
        m === "focus" && tg !== null && tg > 0
          ? Math.min(1, es / tg)
          : 0;

      // depthScale: how long is this session overall? (0..1, 180 min = max)
      // depthParam: unified 0..1 driver that replaces bare `progress` in draw().
      //
      //   Focus mode:   combines relative progress WITH target length.
      //                 60 min session at 100% < 180 min session at 100%.
      //
      //   Stopwatch:    no target → grows purely with elapsed time.
      //                 Deepens continuously, same 180-min scale.
      const MAX_S = 180 * 60;
      let depthParam = 0;
      if (m === "focus" && tg !== null) {
        const depthScale = Math.min(tg / MAX_S, 1.0);
        depthParam = Math.min(
          newProgress * (0.55 + depthScale * 0.45) + depthScale * 0.12,
          1.0,
        );
      } else if (m === "stopwatch") {
        depthParam = Math.min(es / MAX_S, 1.0);
      }

      st.prevStatus = st.status;
      st.status = newStatus;
      st.progress = newProgress;
      st.depthParam = depthParam;
      st.t += dt;

      // Accumulators
      if (newStatus === "paused") {
        st.jitterT += dt;
      } else {
        st.jitterT = 0;
      }
      if (newStatus === "finished" && st.prevStatus !== "finished") {
        st.burstT = 0;
      }
      if (newStatus === "finished") {
        st.burstT = Math.min(st.burstT + dt, 2000);
      }

      // Core orb scale: compact in idle, blooms on start, grows with session depth.
      const depthGrowth = newStatus === "running" ? st.depthParam : 0;
      const scaleTarget = newStatus === "idle" ? 0.20 : 0.84 + depthGrowth * 0.38;
      const scaleLerp = newStatus === "idle"
        ? Math.min(dt * 0.0018, 1)
        : Math.min(dt * 0.0030, 1);
      st.coreScale = lerp(st.coreScale, scaleTarget, scaleLerp);

      // Finish explosion fires on:
      //   1. Natural completion   (→ finished)
      //   2. Reset / log save     (running | paused | finished → idle)
      if (st.prevStatus !== "finished" && st.status === "finished") {
        st.finishBurstT = 1400;
      }
      if (
        st.status === "idle" &&
        (st.prevStatus === "running" ||
          st.prevStatus === "paused" ||
          st.prevStatus === "finished")
      ) {
        st.finishBurstT = 1400;
      }
      if (st.finishBurstT > 0) st.finishBurstT -= dt;

      // Ring burst: idle → running fires an outward bloom.
      // Rings open from their huddled 0.35 position to 1.08 (gentle overshoot), settle to 1.0.
      if (st.prevStatus === "idle" && st.status === "running") {
        st.ringBurstT = 520; // ms the overshoot target is held
      }
      if (st.ringBurstT > 0) st.ringBurstT -= dt;

      const depthRingGrowth = st.status === "running" ? st.depthParam * 0.40 : 0;
      const ringScaleTarget =
        st.status === "idle"    ? 0.12 :   // huddled against the core
        st.ringBurstT > 0       ? 0.94 :   // gentle overshoot
        0.88 + depthRingGrowth;

      const ringLerp =
        st.ringBurstT > 0    ? Math.min(dt * 0.011, 1) :  // ~90 ms — firm but not jarring
        st.status === "idle" ? Math.min(dt * 0.003, 1)  :  // ~333 ms collapse
        Math.min(dt * 0.005, 1);                           // ~200 ms settle
      st.ringScale = lerp(st.ringScale, ringScaleTarget, ringLerp);

      // Ring rotation
      const ringSpeed =
        newStatus === "running"  ? 1.0  :
        newStatus === "finished" ? 0.45 :
        newStatus === "idle"     ? 0.22 :
        0.0; // paused = stopped
      for (let i = 0; i < st.rings.length; i++) {
        st.rings[i].angle +=
          st.rings[i].speed * st.rings[i].dir * dt * ringSpeed;
      }

      // Draw frame
      ctx.setTransform(anim.dpr, 0, 0, anim.dpr, 0, 0);
      ctx.clearRect(0, 0, anim.cssW, anim.cssH);
      draw(ctx, anim.cssW, anim.cssH, st, propsRef.current.ambient);

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
    };
  }, []); // intentionally empty – all live data flows through propsRef

  return (
    <div ref={wrapperRef} className={className}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
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
