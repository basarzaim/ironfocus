import { useRef, useEffect, type FC } from "react";
import type { TimerMode } from "../../../types/models";

// ── Public API ─────────────────────────────────────────────────────────────────

export interface FluidCoreProps {
  mode: TimerMode;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  displayTime: string;
  className?: string;
  /** Full-bleed ambient layer (edge fade handled by parent wrapper). */
  ambient?: boolean;
  /** When false, timer digits are omitted (parent renders them in the UI stack). */
  showTimer?: boolean;
}

// ── Internal types ─────────────────────────────────────────────────────────────

type CoreStatus = "idle" | "running" | "paused" | "finished";

interface FluidParticle {
  angle: number;          // current orbit angle (rad), updated each frame
  radiusFrac: number;     // fraction of maxR — fixed for lifetime of particle
  angularSpeed: number;   // rad/ms, signed (direction baked in)
  wobblePhase: number;    // random phase: drives organic radius + angle micro-drift
  wobbleAmp: number;      // radial wobble amplitude (inner = less, outer = more)
  size: number;           // dot radius in CSS px
  baseAlpha: number;      // opacity ceiling
  rgb: readonly [number, number, number];
}

interface CloudParticle {
  angle: number;
  radiusFrac: number;   // fraction of maxR, range: CLOUD_R_MIN – CLOUD_R_MAX
  angularSpeed: number; // rad/ms, signed — mixed CW/CCW for static-halo feel
  wobblePhase: number;
  size: number;
  baseAlpha: number;
}

interface FluidState {
  t: number;
  status: CoreStatus;
  prevStatus: CoreStatus;
  depthParam: number;
  currentSpeed: number;
  targetSpeed: number;
  currentBlur: number;
  targetBlur: number;
  /** 0 = breathing fully inactive, 1 = fully active. Lerped on state transition
   *  so the breath fades in/out smoothly instead of snapping. */
  breathAmt: number;
  /** Overall scale multiplier applied to all radii.
   *  Starts at 0.60 (compact idle), bursts to 1.12 on start, settles to 1.0. */
  currentScale: number;
  /** Countdown timer (ms) for the burst overshoot phase after idle → running. */
  burstT: number;
  jitterT: number;
  particles: FluidParticle[];
  cloud: CloudParticle[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Angular speed at the innermost orbit (rad/ms). Full revolution ≈ 14 s. */
const SPEED_INNER = 0.00045;

/** Angular speed at the outermost orbit. Full revolution ≈ 50 s. */
const SPEED_OUTER = 0.000126;

const PARTICLE_COUNT = 280;

// ── Gas-cloud halo constants ────────────────────────────────────────────────
/** Number of cloud wisps. Low count — motion-blur accumulation does the blending. */
const CLOUD_COUNT = 42;
/** Innermost cloud orbit — just outside the timer text boundary. */
const CLOUD_R_MIN = 0.06;
/** Outermost cloud orbit — slightly inside the first particle band. */
const CLOUD_R_MAX = 0.15;

/** Inner bound of the particle field (fraction of maxR). Center is kept clear for text. */
const R_MIN = 0.12;

/** Outer bound. */
const R_MAX = 0.73;

const MAX_SESSION_S = 180 * 60;

// ── Utilities ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function rgba(r: number, g: number, b: number, a: number): string {
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
  if (
    mode === "focus" &&
    targetSeconds !== null &&
    elapsedSeconds >= targetSeconds
  )
    return "finished";
  return "paused";
}

function computeDepthParam(
  mode: TimerMode,
  progress: number,
  elapsedSeconds: number,
  targetSeconds: number | null,
): number {
  if (mode === "focus" && targetSeconds !== null) {
    const depthScale = Math.min(targetSeconds / MAX_SESSION_S, 1.0);
    return Math.min(
      progress * (0.55 + depthScale * 0.45) + depthScale * 0.12,
      1.0,
    );
  }
  if (mode === "stopwatch") {
    return Math.min(elapsedSeconds / MAX_SESSION_S, 1.0);
  }
  return 0;
}

// ── Particle factory ───────────────────────────────────────────────────────────

/**
 * Creates a single particle with logarithmically-biased radius.
 *
 * Math: u ~ Uniform(0,1)
 *       t = u^2.2            → biases t toward 0 → inner radii are denser
 *       radiusFrac = R_MIN + (R_MAX - R_MIN) * t
 *
 * Result: ~60 % of particles live in the inner 40 % of the field,
 * producing a bright vortex eye that thins naturally toward the edge.
 */
function mkParticle(i: number): FluidParticle {
  const u = Math.random();
  const t = Math.pow(u, 2.2); // logarithmic bias toward inner radii
  const radiusFrac = R_MIN + (R_MAX - R_MIN) * t;

  // Normalised position 0 (inner) → 1 (outer), used for everything below
  const n = (radiusFrac - R_MIN) / (R_MAX - R_MIN);

  // Differential rotation: inner orbits faster (real fluid vortex / Keplerian)
  // ±15 % individual variance — particles at the same radius drift apart
  // and regroup over time, creating organic interference instead of rigid rings
  const speedMag = lerp(SPEED_INNER, SPEED_OUTER, n) * (0.85 + Math.random() * 0.30);

  // Direction alternates across 4 radial zones (maintains interference pattern)
  const zone = Math.floor(n * 4);
  const dir = zone % 2 === 0 ? 1 : -1;

  // Colour: warm gold (inner) → dark iron-bronze (outer)
  const cr = Math.round(lerp(255, 148, n));
  const cg = Math.round(lerp(200,  82, n));
  const cb = Math.round(lerp( 65,  28, n));

  // Dot size: inner particles are slightly larger/brighter
  const size = lerp(1.85, 0.72, n) + Math.random() * 0.45;

  // Alpha: Gaussian peak just inside the vortex wall (n ≈ 0.14)
  // Creates a bright eyewall ring rather than uniform brightness
  const peakN = 0.14;
  const spread = 0.38;
  const gauss = Math.exp(-Math.pow((n - peakN) / spread, 2));
  const baseAlpha = (0.05 + 0.10 * gauss) * (0.55 + Math.random() * 0.45);

  // B: Inner turbulence base — inner particles now have larger base wobble amplitude.
  // The faster turbulence layer is added per-frame in drawFrame.
  const wobbleAmp = lerp(0.085, 0.042, n); // inner: 0.085, outer: 0.042

  return {
    angle: (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * Math.PI * 0.35,
    radiusFrac,
    angularSpeed: speedMag * dir,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp,
    size,
    baseAlpha,
    rgb: [cr, cg, cb],
  };
}

function mkParticles(): FluidParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => mkParticle(i));
}

// ── Cloud-halo factory ─────────────────────────────────────────────────────

/**
 * Creates a single gas-cloud wisp orbiting very close to the core centre.
 *
 * Key design choices for the "static halo" feel:
 *  - Mixed CW / CCW directions so net rotation is near-zero visually.
 *  - Very slow speed (0.0003 – 0.0008 rad/ms, independent of currentSpeed).
 *  - Very low alpha; motion-blur accumulation blends them into a soft ring.
 *  - Slightly larger dots (2.5–5 px) for a diffuse, gaseous appearance.
 */
function mkCloudParticle(i: number): CloudParticle {
  const radiusFrac = CLOUD_R_MIN + (CLOUD_R_MAX - CLOUD_R_MIN) * Math.random();
  // Slow drift; alternating direction by index keeps the cloud visually static
  const speed = (0.00030 + Math.random() * 0.00050) * (i % 2 === 0 ? 1 : -1);
  return {
    angle:       (i / CLOUD_COUNT) * Math.PI * 2 + Math.random() * 0.4,
    radiusFrac,
    angularSpeed: speed,
    wobblePhase:  Math.random() * Math.PI * 2,
    size:         3.5 + Math.random() * 3.5,
    baseAlpha:    0.10 + Math.random() * 0.10, // 0.10 – 0.20
  };
}

function mkCloud(): CloudParticle[] {
  return Array.from({ length: CLOUD_COUNT }, (_, i) => mkCloudParticle(i));
}

function mkState(): FluidState {
  return {
    t: 0,
    status: "idle",
    prevStatus: "idle",
    depthParam: 0,
    currentSpeed: 0.04,
    targetSpeed: 0.04,
    currentBlur: 0.14,
    targetBlur: 0.14,
    breathAmt: 0,
    currentScale: 0.38,
    burstT: 0,
    jitterT: 0,
    particles: mkParticles(),
    cloud: mkCloud(),
  };
}

// ── Draw ───────────────────────────────────────────────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  st: FluidState,
): void {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(w, h) / 2;
  const d = st.depthParam;

  // A: Lissajous-drifting glow centre — two irrational frequencies produce a path
  // that never exactly repeats, so the core always looks organically off-centre.
  // Drift is active only while the session is running or just finished.
  const driftActive = st.status === "running" || st.status === "finished";
  const driftAmt = driftActive ? maxR * 0.044 : 0;
  const glowCx = cx + driftAmt * Math.sin(st.t * 0.00031);
  const glowCy = cy + driftAmt * Math.cos(st.t * 0.00023);

  // ── Motion-blur fill ──────────────────────────────────────────────────────────
  // The core trick: semi-opaque black each frame instead of clearRect.
  // Old pixels decay toward black → natural trailing → hypnotic ghosting.
  ctx.fillStyle = `rgba(0,0,0,${st.currentBlur})`;
  ctx.fillRect(0, 0, w, h);

  // ── Per-frame scalars ─────────────────────────────────────────────────────────

  // As depthParam grows, the field expands outward — vortex "fills up" with work.
  // At d=0 (session start): normal size.
  // At d=1 (180 min session end): outer particles reach ~93 % of canvas radius.
  const scaleFrac = 1.0 + d * 0.28;

  let alphaScale: number;
  if (st.status === "running") {
    alphaScale = 0.75 + d * 0.25;
  } else if (st.status === "idle") {
    // Visible enough to clearly show the compact state before start.
    alphaScale = 0.42;
  } else if (st.status === "paused") {
    alphaScale = 0.40;
  } else {
    // finished: slow warm pulse
    alphaScale = 0.80 + 0.20 * Math.sin(st.t * 0.00185);
  }

  // ── Centre radial glow ────────────────────────────────────────────────────────
  // Sits behind everything, grows softly as depthParam increases.
  // Creates the sense that the timer "charges up" over the session.
  if (alphaScale > 0.06) {
    // ── Breathing ─────────────────────────────────────────────────────────────
    // breathPhase ∈ [0, 1]: 0 = full exhale, 1 = full inhale.
    // Wave is (1 + sin) / 2 so it NEVER goes negative — no sudden dark cuts.
    // Blended with 0.5 (neutral) via breathAmt so it fades in/out on state change.
    const breathFreq  = lerp(0.000898, 0.000654, d); // ~7 s → ~9.6 s per breath
    const rawBreath   = (1.0 + Math.sin(st.t * breathFreq)) / 2; // [0, 1]
    const breathPhase = lerp(0.5, rawBreath, st.breathAmt);
    // breathPhase = 0.5 when inactive (neutral, no modulation)

    // Glow radius expands on inhale, contracts on exhale.
    // Range: 78 %–122 % of base radius (neutral = 100 %).
    // Also scaled by currentScale for the idle-compact / burst animation.
    const glowBaseR = maxR * (0.15 + d * 0.18) * st.currentScale;
    const glowR     = glowBaseR * (0.78 + 0.44 * breathPhase);

    // Glow alpha brightens on inhale, dims (but never vanishes) on exhale.
    // Range: 55 %–145 % of base alpha (neutral = 100 %).
    const glowA = (0.032 + d * 0.072) * alphaScale * (0.55 + 0.90 * breathPhase);
    // A: gradient centred on the drifting point — makes the light source feel alive
    const g = ctx.createRadialGradient(glowCx, glowCy, 0, glowCx, glowCy, glowR);
    g.addColorStop(0,   rgba(255, 200, 80, glowA));
    g.addColorStop(0.5, rgba(220, 148, 50, glowA * 0.32));
    g.addColorStop(1,   rgba(200, 128, 40, 0));
    ctx.beginPath();
    ctx.arc(glowCx, glowCy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── Gas-cloud halo ────────────────────────────────────────────────────────────
  // Soft wisps orbiting very close to centre, well inside the first particle band.
  // Mixed CW/CCW directions make the cloud appear nearly stationary — a persistent
  // ambient glow rather than a spinning ring.
  {
    const cloudAlpha =
      st.status === "running"  ? 1.00 :
      st.status === "finished" ? 0.90 :
      st.status === "paused"   ? 0.65 :
      0.35; // idle: faintly visible

    if (cloudAlpha > 0.05) {
      for (const cp of st.cloud) {
        const wobble = 1 + 0.06 * Math.sin(st.t * 0.0011 + cp.wobblePhase);
        const r  = cp.radiusFrac * maxR * wobble * st.currentScale;
        const px = cx + r * Math.cos(cp.angle);
        const py = cy + r * Math.sin(cp.angle);
        const a  = cp.baseAlpha * cloudAlpha;
        if (a < 0.004) continue;
        ctx.beginPath();
        ctx.arc(px, py, cp.size, 0, Math.PI * 2);
        // Warm amber tint — slightly more orange than the outer particles
        ctx.fillStyle = rgba(255, 172, 55, a);
        ctx.fill();
      }
    }
  }

  // ── Archimedean spiral skeleton ───────────────────────────────────────────────
  // Two extremely faint arms give the vortex its structural "spine".
  // Only visible when the session is active (would distract in idle/paused).
  if (st.status === "running" || st.status === "finished") {
    const spiralAlpha = 0.015 * alphaScale;
    if (spiralAlpha > 0.003) {
      const turns = Math.PI * 5;
      const rMin = maxR * R_MIN * scaleFrac * st.currentScale;
      const rMax = maxR * 0.66 * scaleFrac * st.currentScale;
      const steps = 100;
      // Spiral rotates with the innermost particles — looks anchored
      const baseAngle =
        st.particles[0].angle; // first particle is always inner

      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        const armOffset = arm * Math.PI;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * turns;
          const r = rMin + (rMax - rMin) * (theta / turns);
          const x = cx + r * Math.cos(baseAngle + armOffset + theta);
          const y = cy + r * Math.sin(baseAngle + armOffset + theta);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = rgba(200, 148, 48, spiralAlpha);
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }
    }
  }

  // ── Particle field ────────────────────────────────────────────────────────────
  for (const p of st.particles) {
    // Normalised radial position: 0 = innermost, 1 = outermost
    const n = (p.radiusFrac - R_MIN) / (R_MAX - R_MIN);

    // Slow base wobble (all particles)
    const baseWobbleR = p.wobbleAmp * Math.sin(st.t * 0.00085 + p.wobblePhase);
    const baseWobbleA = 0.032 * Math.sin(st.t * 0.00062 + p.wobblePhase * 1.4);

    // B: Inner turbulence — a second, faster oscillation layered on top.
    // Fades out completely at n ≥ 0.42 so only the inner ~40 % of the field is affected.
    const innerFrac = Math.max(0, 1 - n / 0.42);
    const turbR = innerFrac * 0.09 * Math.sin(st.t * 0.0022 + p.wobblePhase * 3.7);
    const turbA = innerFrac * 0.075 * Math.cos(st.t * 0.0018 + p.wobblePhase * 2.4);

    const wobbleR = 1 + baseWobbleR + turbR;
    const wobbleA = baseWobbleA + turbA;

    const radius = p.radiusFrac * maxR * scaleFrac * st.currentScale * wobbleR;
    const angle = p.angle + wobbleA;

    let px = cx + radius * Math.cos(angle);
    let py = cy + radius * Math.sin(angle);

    // PAUSED: particles vibrate in place with irregular dual-frequency noise
    if (st.status === "paused") {
      const jAmt = 1.0 + p.radiusFrac * 0.5; // outer particles jitter more
      px += jAmt * Math.sin(st.jitterT * 0.011 + p.wobblePhase * 7.3);
      py += jAmt * Math.cos(st.jitterT * 0.009 + p.wobblePhase * 5.1);
    }

    const alpha = p.baseAlpha * alphaScale;
    if (alpha < 0.005) continue;

    const [r, g, b] = p.rgb;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fillStyle = rgba(r, g, b, alpha);
    ctx.fill();
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const FluidCore: FC<FluidCoreProps> = ({
  mode,
  isRunning,
  elapsedSeconds,
  targetSeconds,
  displayTime,
  className = "h-72 w-72",
  showTimer = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({ mode, isRunning, elapsedSeconds, targetSeconds });
  useEffect(() => {
    propsRef.current = { mode, isRunning, elapsedSeconds, targetSeconds };
  });

  const animRef = useRef<{
    state: FluidState | null;
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
    const ctx = ctxOrNull;

    const anim = animRef.current;

    function applySize() {
      const rect = wrapper!.getBoundingClientRect();
      const size = Math.max(rect.width || 288, rect.height || 288);
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      anim.cssW = size;
      anim.cssH = size;
      anim.dpr = dpr;
    }

    applySize();
    anim.state = mkState();

    const ro = new ResizeObserver(applySize);
    ro.observe(wrapper);

    function frame(ts: number) {
      const dt = anim.lastTs !== null ? Math.min(ts - anim.lastTs, 50) : 16;
      anim.lastTs = ts;

      const {
        mode: m,
        isRunning: ir,
        elapsedSeconds: es,
        targetSeconds: tg,
      } = propsRef.current;
      const st = anim.state!;

      const newStatus = deriveStatus(m, ir, es, tg);
      const newProgress =
        m === "focus" && tg !== null && tg > 0 ? Math.min(1, es / tg) : 0;
      const newDepth = computeDepthParam(m, newProgress, es, tg);

      st.prevStatus = st.status;
      st.status = newStatus;
      st.depthParam = newDepth;
      st.t += dt;

      st.targetSpeed =
        newStatus === "running"  ? 1.0  :
        newStatus === "finished" ? 0.22 :
        newStatus === "idle"     ? 0.04 :
        0.0;

      st.targetBlur =
        newStatus === "idle"    ? 0.08 : // slower clearing so compact state stays visible
        newStatus === "running" ? 0.07 :
        0.10;

      st.currentSpeed = lerp(st.currentSpeed, st.targetSpeed, Math.min(dt * 0.0018, 1));
      st.currentBlur  = lerp(st.currentBlur,  st.targetBlur,  Math.min(dt * 0.002,  1));

      // ── Scale animation ──────────────────────────────────────────────────────
      // idle → running transition: fire the burst overshoot.
      if (st.prevStatus === "idle" && st.status === "running") {
        st.burstT = 480; // ms: how long the overshoot target is held
      }
      if (st.burstT > 0) st.burstT -= dt;

      const scaleTarget =
        st.status === "idle"   ? 0.38 : // tight compact rings close to centre
        st.status === "paused" ? 0.92 :
        st.burstT > 0          ? 1.22 : // burst overshoot — clearly larger than idle
        1.0;                             // normal running / finished

      // Three lerp rates:
      //  - burst  : very fast (~60 ms) to create a snappy "bloom" pop
      //  - idle   : moderate (~900 ms) so compact state is reached quickly after stopping
      //  - settle : slow (~700 ms) for a smooth post-burst landing
      const scaleLerp =
        st.burstT > 0          ? Math.min(dt * 0.010, 1) :
        st.status === "idle"   ? Math.min(dt * 0.004, 1) :
        Math.min(dt * 0.0020, 1);
      st.currentScale = lerp(st.currentScale, scaleTarget, scaleLerp);

      if (newStatus === "paused") {
        st.jitterT += dt;
      } else {
        st.jitterT = 0;
      }

      // breathAmt lerps to 1 when running, back to 0 otherwise.
      // This drives the glow breathing in drawFrame with a smooth fade-in/out.
      st.breathAmt = lerp(
        st.breathAmt,
        newStatus === "running" ? 1.0 : 0.0,
        Math.min(dt * 0.0015, 1),
      );

      // Cloud halo: advances at its own fixed slow speed, independent of currentSpeed.
      for (const cp of st.cloud) {
        cp.angle += cp.angularSpeed * dt;
      }

      // Advance each particle individually (differential rotation — no breathing
      // modulation on speed; breathing is expressed through the glow only).
      for (const p of st.particles) {
        p.angle += p.angularSpeed * dt * st.currentSpeed;
      }

      ctx.setTransform(anim.dpr, 0, 0, anim.dpr, 0, 0);
      drawFrame(ctx, anim.cssW, anim.cssH, st);

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
  }, []);

  const status = deriveStatus(mode, isRunning, elapsedSeconds, targetSeconds);

  const textColorClass =
    status === "running"  ? "text-amber-100/88" :
    status === "finished" ? "text-amber-200/95" :
    "text-neutral-400/70";

  const textGlowClass =
    status === "running"
      ? "drop-shadow-[0_0_14px_rgba(200,146,26,0.55)]"
      : status === "finished"
        ? "drop-shadow-[0_0_20px_rgba(230,180,60,0.80)]"
        : "";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-live="polite"
        aria-label={`Timer: ${displayTime}`}
      >
        {showTimer && (
          <span
            className={`select-none font-mono text-2xl font-light tracking-widest ${textColorClass} ${textGlowClass}`}
          >
            {displayTime}
          </span>
        )}
      </div>
    </div>
  );
};
