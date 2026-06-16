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

interface FluidState {
  t: number;
  status: CoreStatus;
  prevStatus: CoreStatus;
  depthParam: number;
  currentSpeed: number;
  targetSpeed: number;
  currentBlur: number;
  targetBlur: number;
  jitterT: number;
  particles: FluidParticle[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Angular speed at the innermost orbit (rad/ms). Full revolution ≈ 14 s. */
const SPEED_INNER = 0.00045;

/** Angular speed at the outermost orbit. Full revolution ≈ 50 s. */
const SPEED_OUTER = 0.000126;

const PARTICLE_COUNT = 280;

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

  // Organic wobble: inner more ordered, outer more chaotic
  const wobbleAmp = lerp(0.025, 0.065, n);

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
    jitterT: 0,
    particles: mkParticles(),
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
    alphaScale = 0.18;
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
    const glowR = maxR * (0.15 + d * 0.18);
    const glowA = (0.032 + d * 0.072) * alphaScale;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0,   rgba(255, 200, 80, glowA));
    g.addColorStop(0.5, rgba(220, 148, 50, glowA * 0.32));
    g.addColorStop(1,   rgba(200, 128, 40, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // ── Archimedean spiral skeleton ───────────────────────────────────────────────
  // Two extremely faint arms give the vortex its structural "spine".
  // Only visible when the session is active (would distract in idle/paused).
  if (st.status === "running" || st.status === "finished") {
    const spiralAlpha = 0.015 * alphaScale;
    if (spiralAlpha > 0.003) {
      const turns = Math.PI * 5;
      const rMin = maxR * R_MIN * scaleFrac;
      const rMax = maxR * 0.66 * scaleFrac;
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
    // Organic radius wobble (inner = tight, outer = loose)
    const wobbleR = 1 + p.wobbleAmp * Math.sin(st.t * 0.00085 + p.wobblePhase);
    // Slight angular micro-drift keeps it from looking perfectly circular
    const wobbleA = 0.032 * Math.sin(st.t * 0.00062 + p.wobblePhase * 1.4);

    const radius = p.radiusFrac * maxR * scaleFrac * wobbleR;
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
        newStatus === "idle"    ? 0.14 :
        newStatus === "running" ? 0.07 :
        0.10;

      st.currentSpeed = lerp(st.currentSpeed, st.targetSpeed, Math.min(dt * 0.0018, 1));
      st.currentBlur  = lerp(st.currentBlur,  st.targetBlur,  Math.min(dt * 0.002,  1));

      if (newStatus === "paused") {
        st.jitterT += dt;
      } else {
        st.jitterT = 0;
      }

      // Advance each particle individually (differential rotation)
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
        <span
          className={`select-none font-mono text-2xl font-light tracking-widest ${textColorClass} ${textGlowClass}`}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
};
