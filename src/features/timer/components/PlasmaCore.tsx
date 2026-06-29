import { useRef, useEffect, type FC } from "react";
import { useTheme } from "../../../state/ThemeProvider";
import type { TimerMode } from "../../../types/models";

// ── Public API (drop-in compatible with LivingCore) ─────────────────────────────

export interface PlasmaCoreProps {
  mode: TimerMode;
  isRunning: boolean;
  elapsedSeconds: number;
  targetSeconds: number | null;
  /** Formatted display string, e.g. "01:30:00" */
  displayTime: string;
  /** Tailwind classes for the wrapper. Controls visual size. */
  className?: string;
  /** Full-bleed ambient layer: soft edge fade so square canvas corners disappear. */
  ambient?: boolean;
  /** When false, timer digits are omitted (parent renders them in the UI stack). */
  showTimer?: boolean;
}

// ── Internal types ──────────────────────────────────────────────────────────────

type CoreStatus = "idle" | "running" | "paused" | "finished";

/** Spark hugging the core surface. Not a far orbit — reads as ejecta off one mass. */
interface Ember {
  angle: number;
  drift: number;
  radial: number;
  size: number;
  baseAlpha: number;
  phase: number;
  scatterDir: number;
  radialPhase: number;
}

/** Drifting light pool inside the molten body — fakes churning plasma. */
interface FlowCell {
  ax: number; ay: number;
  fx: number; fy: number;
  px: number; py: number;
  radius: number;
  hue: 0 | 1;
}

/** Expanding shock ring on finish / start bloom. */
interface Shock {
  age: number;
  life: number;
  power: number;
}

interface CanvasState {
  t: number;
  status: CoreStatus;
  prevStatus: CoreStatus;
  progress: number;
  depthParam: number;
  embers: Ember[];
  flow: FlowCell[];
  shocks: Shock[];
  jitterT: number;
  coreScale: number;
  bloomT: number;
  finishT: number;
}

/** Warm accent colors — classic gold or wife pink. Iron base stays shared. */
interface AccentPalette {
  hot: string;
  warm: string;
  bright: string;
  mid: string;
  secondary: string;
  coronaHint: string;
}

// ── Palette (shared dark iron / bronze / molten gold theme) ─────────────────────

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

const CLASSIC_ACCENT: AccentPalette = {
  hot: K.WARM_WHITE,
  warm: K.WARM_WHITE,
  bright: K.GOLD_BRT,
  mid: K.GOLD,
  secondary: K.AMBER,
  coronaHint: K.BRONZE,
};

const WIFE_ACCENT: AccentPalette = {
  hot: "#fce7f3",
  warm: "#fce7f3",
  bright: "#f472b6",
  mid: "#ec4899",
  secondary: "#db2777",
  coronaHint: "#be185d",
};

const BLOOM_MS = 560;
const FINISH_MS = 1400;
const SHOCK_LIFE = 1100;

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
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${r},${g},${b},${alpha})`;
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
  const r = Math.round(lerp(ar, br, u));
  const g = Math.round(lerp(ag, bg, u));
  const bl = Math.round(lerp(ab, bb, u));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
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

function mkEmbers(): Ember[] {
  return Array.from({ length: 20 }, (_, i) => ({
    angle: (i / 20) * Math.PI * 2 + Math.random() * 0.5,
    drift: (0.00012 + Math.random() * 0.0002) * (i % 2 === 0 ? 1 : -1),
    radial: 1.06 + Math.random() * 0.5,
    size: 0.8 + Math.random() * 1.5,
    baseAlpha: 0.16 + Math.random() * 0.34,
    phase: Math.random() * Math.PI * 2,
    scatterDir: 0.7 + Math.random() * 0.7,
    radialPhase: Math.random() * Math.PI * 2,
  }));
}

function mkFlow(): FlowCell[] {
  return [
    { ax: 0.34, ay: 0.28, fx: 0.00026, fy: 0.00019, px: 0.0,  py: 1.3, radius: 0.62, hue: 0 },
    { ax: 0.26, ay: 0.36, fx: 0.00017, fy: 0.00031, px: 2.1,  py: 0.4, radius: 0.50, hue: 1 },
    { ax: 0.40, ay: 0.22, fx: 0.00022, fy: 0.00014, px: 4.0,  py: 3.1, radius: 0.44, hue: 0 },
    { ax: 0.20, ay: 0.30, fx: 0.00013, fy: 0.00024, px: 5.4,  py: 2.2, radius: 0.38, hue: 1 },
  ];
}

const DEEP_FLOW: FlowCell[] = [
  { ax: 0.18, ay: 0.42, fx: 0.00021, fy: 0.00027, px: 1.2, py: 4.8, radius: 0.34, hue: 0 },
  { ax: 0.44, ay: 0.16, fx: 0.00015, fy: 0.00018, px: 3.7, py: 0.9, radius: 0.30, hue: 1 },
];

function ensureDeepFlow(st: CanvasState): void {
  if (st.depthParam > 0.6 && st.flow.length < 6) {
    st.flow.push(...DEEP_FLOW);
  }
}

function spawnShock(st: CanvasState, power: number): void {
  st.shocks.push({ age: 0, life: SHOCK_LIFE, power });
  if (st.shocks.length > 6) st.shocks.shift();
}

// ── Geometry: organic single-mass silhouette ────────────────────────────────────

function blobRadius(R: number, theta: number, t: number, amp: number): number {
  const w2 = Math.sin(theta * 2 + t * 0.00058) * 0.060;
  const w3 = Math.sin(theta * 3 - t * 0.00041 + 1.7) * 0.038;
  const w5 = Math.sin(theta * 5 + t * 0.00029 + 4.1) * 0.022;
  return R * (1 + (w2 + w3 + w5) * amp);
}

function traceBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  t: number,
  amp: number,
): void {
  const STEPS = 110;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const theta = (i / STEPS) * Math.PI * 2;
    const r = blobRadius(R, theta, t, amp);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ── Master draw ──────────────────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  st: CanvasState,
  ambient: boolean,
  reduced: boolean,
  palette: AccentPalette,
  lightMode: boolean,
): void {
  const cx = cssW / 2;
  const cy = cssH / 2;
  const maxR = Math.min(cssW, cssH) / 2;
  const d = st.depthParam;
  const heat = d;

  // ── Breath + intensity ──────────────────────────────────────────────────────
  const breathFreq =
    st.status === "running" ? 0.00060 - d * 0.00030 : 0.000175;
  let breath = reduced ? 0 : Math.sin(st.t * breathFreq);
  if (!reduced && st.status === "running" && d > 0.8) {
    breath = breath * 0.72 + Math.sin(st.t * 0.00112) * 0.28;
  }

  let glow: number;
  if (st.status === "running") {
    glow = (0.18 + 0.82 * (0.5 + 0.5 * breath)) * (0.40 + d * 0.42);
  } else if (st.status === "idle") {
    glow = lightMode
      ? 0.07 + 0.04 * (0.5 + 0.5 * breath)
      : 0.05 + 0.04 * (0.5 + 0.5 * breath);
  } else if (st.status === "paused") {
    glow = 0.14;
  } else {
    glow = 0.55 + 0.30 * (0.5 + 0.5 * Math.sin(st.t * 0.00185));
  }

  const blobAmp =
    st.status === "running" ? 0.85 + d * 0.65 :
    st.status === "finished" ? 1.1 :
    st.status === "paused" ? 0.25 : 0.45;

  const bloomFrac = Math.max(0, st.bloomT / BLOOM_MS);
  const finishFrac = Math.max(0, st.finishT / FINISH_MS);
  const finishPow = finishFrac * finishFrac * finishFrac;

  const breathExpand = st.status === "running" ? 0.10 + d * 0.07 : 0.04;
  let R = maxR * 0.30 * st.coreScale * (1 + breath * breathExpand);
  R *= 1 + bloomFrac * bloomFrac * 0.14;
  R *= 1 + finishPow * 0.55;

  let jx = 0, jy = 0;
  if (st.status === "paused") {
    const jt = st.jitterT;
    const jAmt = R * 0.02;
    jx = Math.sin(jt * 0.0148) * Math.sin(jt * 0.0213) * jAmt;
    jy = Math.cos(jt * 0.0182) * Math.sin(jt * 0.0097) * jAmt;
  }

  const driftOn = !reduced && (st.status === "running" || st.status === "finished" || finishFrac > 0.05);
  const driftAmt = driftOn ? maxR * (0.018 + d * 0.007) : 0;
  const dx = jx + driftAmt * Math.sin(st.t * 0.00031);
  const dy = jy + driftAmt * Math.cos(st.t * 0.00023);
  const ox = cx + dx;
  const oy = cy + dy;

  const flowTimeScale =
    st.status === "paused" ? 0.30 :
    st.status === "idle" ? 0.50 : 1.0;
  const flowT = st.t * flowTimeScale;

  const coreCenter = lerpColorHex(palette.warm, palette.bright, heat * 0.35);

  ctx.save();
  ctx.clearRect(0, 0, cssW, cssH);

  // 0. SHOCK RINGS — finish / bloom pulses.
  for (const s of st.shocks) {
    const f = s.age / s.life;
    if (f >= 1) continue;
    const rr = R * 1.15 + (maxR * 0.95 - R * 1.15) * f;
    const a = s.power * (1 - f) * (1 - f) * 0.32;
    if (a < 0.01) continue;
    ctx.beginPath();
    ctx.arc(ox, oy, rr, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(palette.bright, a);
    ctx.lineWidth = 1 + (1 - f) * 2.2;
    ctx.stroke();
  }

  // 1. CORONA — soft halo behind the mass.
  {
    const depthCorona =
      st.status === "running" || st.status === "finished" ? d * 0.5 : 0;
    const coronaR = R * (1.65 + glow * 1.0 + depthCorona) * (1 + bloomFrac * 0.6 + finishPow * 1.4);
    const g = ctx.createRadialGradient(ox, oy, R * 0.5, ox, oy, coronaR);
    g.addColorStop(0,    rgba(palette.mid, glow * 0.42));
    g.addColorStop(0.28, rgba(palette.mid, glow * 0.16));
    g.addColorStop(0.7,  rgba(K.BRONZE, glow * 0.05));
    g.addColorStop(1,    rgba(palette.mid, 0));
    ctx.beginPath();
    ctx.arc(ox, oy, coronaR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // 2. BODY — molten mass with off-centre radial fill.
  traceBlob(ctx, ox, oy, R, st.t, blobAmp);
  const bx = ox - R * 0.26;
  const by = oy - R * 0.26;
  const body = ctx.createRadialGradient(bx, by, 0, ox, oy, R * 1.04);
  if (st.status === "idle") {
    body.addColorStop(0,    rgba(K.IRON_RIM, 0.95));
    body.addColorStop(0.55, rgba(K.IRON_MID, 0.98));
    body.addColorStop(1,    rgba(K.IRON, 1));
  } else if (st.status === "running") {
    const b = 0.34 + glow * 0.62 + finishPow * 0.6;
    body.addColorStop(0,    rgba(coreCenter, Math.min(1, 0.85 * b)));
    body.addColorStop(0.20, rgba(palette.bright, Math.min(1, 0.80 * b)));
    body.addColorStop(0.52, rgba(palette.mid, 0.74));
    body.addColorStop(0.82, rgba(K.BRONZE, 0.85));
    body.addColorStop(1,    rgba(K.IRON, 1));
  } else if (st.status === "paused") {
    const f = 0.5 + 0.16 * Math.sin(st.t * 0.0031 + 1.1) * Math.sin(st.t * 0.0019);
    body.addColorStop(0,   rgba(palette.mid, 0.5 * f));
    body.addColorStop(0.5, rgba(K.BRONZE, 0.62 * f));
    body.addColorStop(1,   rgba(K.IRON, 1));
  } else {
    const pulse = 0.62 + 0.38 * Math.sin(st.t * 0.00185);
    body.addColorStop(0,    rgba(palette.warm, pulse));
    body.addColorStop(0.26, rgba(palette.bright, pulse * 0.92));
    body.addColorStop(0.6,  rgba(palette.mid, 0.82));
    body.addColorStop(1,    rgba(K.IRON, 1));
  }
  if (glow > 0.05) {
    ctx.shadowColor = palette.bright;
    ctx.shadowBlur = 14 + glow * 38 + finishPow * 40;
  }
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3. INTERNAL FLOW — churning light pools + hot nucleus.
  if (!reduced && glow > 0.06) {
    ctx.save();
    traceBlob(ctx, ox, oy, R * 0.99, st.t, blobAmp);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    for (const c of st.flow) {
      const fxp = ox + R * c.ax * Math.sin(flowT * c.fx + c.px);
      const fyp = oy + R * c.ay * Math.cos(flowT * c.fy + c.py);
      const pr = R * c.radius;
      const depthFlowBoost =
        st.status === "running" || st.status === "finished" ? d * 0.10 : 0;
      const a = glow * ((c.hue === 0 ? 0.20 : 0.15) + depthFlowBoost);
      const cellColor = c.hue === 0 ? palette.bright : palette.secondary;
      const pg = ctx.createRadialGradient(fxp, fyp, 0, fxp, fyp, pr);
      pg.addColorStop(0, rgba(cellColor, a));
      pg.addColorStop(1, rgba(cellColor, 0));
      ctx.beginPath();
      ctx.arc(fxp, fyp, pr, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();
    }
    const nucR = R * (0.30 + d * 0.06 + 0.06 * (0.5 + 0.5 * breath));
    const ng = ctx.createRadialGradient(bx, by, 0, bx, by, nucR);
    ng.addColorStop(0, rgba(palette.warm, glow * 0.55));
    ng.addColorStop(1, rgba(palette.warm, 0));
    ctx.beginPath();
    ctx.arc(bx, by, nucR, 0, Math.PI * 2);
    ctx.fillStyle = ng;
    ctx.fill();
    ctx.restore();
  }

  // 4. SURFACE RIM.
  traceBlob(ctx, ox, oy, R, st.t, blobAmp);
  ctx.strokeStyle = rgba(palette.bright, 0.30 + glow * 0.55 + finishPow * 0.4);
  ctx.lineWidth = 1.1 + glow * 0.8;
  if (glow > 0.1) {
    ctx.shadowColor = palette.mid;
    ctx.shadowBlur = 6 + glow * 10;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 5. EMBERS — surface sparks.
  {
    const emberCount = st.status === "idle" ? 8 : st.embers.length;
    const scatter = bloomFrac * bloomFrac * 0.5 + finishPow * 2.6;
    const alphaBoost =
      (st.status === "running" ? 1.0 : st.status === "idle" ? 0.45 : 0.7) *
      (1 + bloomFrac * 2.2 + finishPow * 7.0);
    const cut = scatter > 0.05 ? 0.01 : 0.05;
    for (let i = 0; i < emberCount; i++) {
      const e = st.embers[i];
      const shimmer = 0.6 + 0.4 * Math.sin(st.t * 0.0019 + e.phase);
      const a = e.baseAlpha * alphaBoost * shimmer;
      if (a < cut) continue;
      const inhale = st.status === "running" ? breath * 0.12 : 0;
      const radialPulse = st.status === "running"
        ? Math.sin(st.t * 0.0028 + e.radialPhase) * 0.08
        : 0;
      const rad = R * (e.radial + inhale + d * 0.15 + radialPulse) + R * scatter * e.scatterDir;
      const x = ox + rad * Math.cos(e.angle);
      const y = oy + rad * Math.sin(e.angle);
      const sz = e.size * (1 + finishPow * 0.6);
      const eg = ctx.createRadialGradient(x, y, 0, x, y, sz * 2.4);
      eg.addColorStop(0,   rgba(palette.warm, Math.min(1, a)));
      eg.addColorStop(0.4, rgba(palette.bright, Math.min(1, a * 0.8)));
      eg.addColorStop(1,   rgba(palette.mid, 0));
      ctx.beginPath();
      ctx.arc(x, y, sz * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = eg;
      ctx.fill();
    }
  }

  ctx.restore();

  // 7. AMBIENT EDGE FADE.
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

// ── Component ─────────────────────────────────────────────────────────────────────

export const PlasmaCore: FC<PlasmaCoreProps> = ({
  mode,
  isRunning,
  elapsedSeconds,
  targetSeconds,
  displayTime,
  className = "relative h-72 w-72",
  ambient = false,
  showTimer = true,
}) => {
  const { theme, colorMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    mode,
    isRunning,
    elapsedSeconds,
    targetSeconds,
    ambient,
    palette: theme === "wife" ? WIFE_ACCENT : CLASSIC_ACCENT,
    lightMode: colorMode === "light",
  });
  useEffect(() => {
    propsRef.current = {
      mode,
      isRunning,
      elapsedSeconds,
      targetSeconds,
      ambient,
      palette: theme === "wife" ? WIFE_ACCENT : CLASSIC_ACCENT,
      lightMode: colorMode === "light",
    };
  });

  const animRef = useRef<{
    state: CanvasState | null;
    raf: number | null;
    lastTs: number | null;
    dpr: number;
    cssW: number;
    cssH: number;
    visible: boolean;
  }>({
    state: null,
    raf: null,
    lastTs: null,
    dpr: 1,
    cssW: 288,
    cssH: 288,
    visible: true,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;

    const anim = animRef.current;

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reduceMq.matches;
    const onReduce = (e: MediaQueryListEvent) => { reduced = e.matches; };
    reduceMq.addEventListener("change", onReduce);

    const onVisibility = () => {
      anim.visible = document.visibilityState === "visible";
      if (anim.visible && anim.raf === null) {
        anim.lastTs = null;
        anim.raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    function applySize() {
      const el = wrapper!;
      const dpr = window.devicePixelRatio || 1;
      const size = Math.max(el.offsetWidth, el.offsetHeight, 1);
      canvas!.width = size * dpr;
      canvas!.height = size * dpr;
      anim.cssW = size;
      anim.cssH = size;
      anim.dpr = dpr;
    }

    applySize();

    anim.state = {
      t: 0,
      status: "idle",
      prevStatus: "idle",
      progress: 0,
      depthParam: 0,
      embers: mkEmbers(),
      flow: mkFlow(),
      shocks: [],
      jitterT: 0,
      coreScale: 0.20,
      bloomT: 0,
      finishT: 0,
    };

    const ro = new ResizeObserver(applySize);
    ro.observe(wrapper);

    function frame(ts: number) {
      if (!anim.visible) {
        anim.raf = null;
        return;
      }

      const dt = anim.lastTs !== null ? Math.min(ts - anim.lastTs, 50) : 16;
      anim.lastTs = ts;

      const { mode: m, isRunning: ir, elapsedSeconds: es, targetSeconds: tg } =
        propsRef.current;
      const st = anim.state!;

      const newStatus = deriveStatus(m, ir, es, tg);
      const newProgress =
        m === "focus" && tg !== null && tg > 0 ? Math.min(1, es / tg) : 0;

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

      ensureDeepFlow(st);

      st.jitterT = newStatus === "paused" ? st.jitterT + dt : 0;

      const depthGrowth = newStatus === "running" ? st.depthParam : 0;
      const scaleTarget = newStatus === "idle" ? 0.20 : 0.84 + depthGrowth * 0.48;
      const scaleLerp =
        newStatus === "idle" ? Math.min(dt * 0.0018, 1) : Math.min(dt * 0.0030, 1);
      st.coreScale = lerp(st.coreScale, scaleTarget, scaleLerp);

      if (st.prevStatus === "idle" && st.status === "running") {
        st.bloomT = BLOOM_MS;
        spawnShock(st, 0.85);
      }
      if (st.bloomT > 0) st.bloomT -= dt;

      if (st.prevStatus !== "finished" && st.status === "finished") {
        st.finishT = FINISH_MS;
        spawnShock(st, 1.0);
      }
      if (
        st.status === "idle" &&
        (st.prevStatus === "running" || st.prevStatus === "paused" || st.prevStatus === "finished")
      ) {
        st.finishT = FINISH_MS;
        spawnShock(st, 0.85);
        st.embers = mkEmbers();
        st.flow = mkFlow();
      }
      if (st.finishT > 0) st.finishT -= dt;

      const driftSpeed =
        newStatus === "running" ? 1.0 : newStatus === "finished" ? 0.5 : newStatus === "idle" ? 0.3 : 0.0;
      for (const e of st.embers) e.angle += e.drift * dt * driftSpeed;

      for (const s of st.shocks) s.age += dt;
      st.shocks = st.shocks.filter((s) => s.age < s.life);

      ctx.setTransform(anim.dpr, 0, 0, anim.dpr, 0, 0);
      draw(
        ctx,
        anim.cssW,
        anim.cssH,
        st,
        propsRef.current.ambient,
        reduced,
        propsRef.current.palette,
        propsRef.current.lightMode,
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
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const timerShadow =
    theme === "wife"
      ? "drop-shadow-[0_1px_8px_rgba(236,72,153,0.5)]"
      : "drop-shadow-[0_1px_8px_rgba(200,146,26,0.5)]";
  const timerColor =
    theme === "wife" ? "text-pink-100/85" : "text-amber-100/85";

  return (
    <div ref={wrapperRef} className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {showTimer && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
          aria-label={`Timer: ${displayTime}`}
        >
          <span className={`select-none font-mono text-2xl font-light tracking-widest ${timerColor} ${timerShadow}`}>
            {displayTime}
          </span>
        </div>
      )}
    </div>
  );
};
