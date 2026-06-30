/** Central knobs for Iron Core 3D look — edit here. */
export const IRON_SCENE_TUNING = {
  exposure: 0.86,
  environmentIntensity: 0.52,
  lights: {
    ambient: 0.32,
    hemisphere: 0.38,
    key: 1.88,
    fill: 0.84,
    rim: 0.36,
  },
  bloom: {
    base: 0.07,
    glowScale: 0.16,
    heatScale: 0.14,
    depthScale: 0.12,
    threshold: 0.52,
  },
  shell: {
    color: "#323940",
    metalness: 0.3,
    roughness: 0.4,
    envMapIntensity: 0.66,
    emissive: "#060809",
    emissiveIntensity: 0,
  },
  /** Shell + core assembly spin (RPM). */
  shellSpin: {
    idle: 1.1,
    running: 4.0,
    paused: 2.4,
    finished: 4.8,
  },
  /** Particle / haze onset after session progress (not visual depth floor). */
  aura: {
    onset: 0.14,
    span: 0.48,
  },
  render: {
    dprMax: 2,
    multisampling: 0,
    smaa: false,
  },
  /**
   * Core visual depth floor at session start (veins / glow / scale).
   * 0 = thin original start. ~0.452 = ~10s preview look.
   */
  coreVisualDepthBase: 0.452,
  /**
   * Preview raw thin veins at session start (depth floor off, no vein sharpen).
   * Set false to restore calibrated look.
   */
  previewThinVeins: false,
  /**
   * Session-start vein sharpening (>1 = thinner veins). Eases to 1.0 with depth.
   * Shader pivots on blackThreshold, not UV — no bake edge smear.
   *
   * Revert preset (2026-06-30 calibrated look):
   *   coreVisualDepthBase: 0.452, veinUvScaleStart: 1, veinDetailStrength: 1
   */
  veinUvScaleStart: 1,
  /** Multiplies (veinUvScaleStart - 1) for a visible but safe thinning range. */
  veinDetailStrength: 1,
  /**
   * Core ramp — Stage 1 (multi-stop + asymmetric edge).
   */
  coreRamp: {
    hot: "#e8b450",
    amber: "#8a5a18",
    shell: "#2a1810",
    deep: "#0a0806",
    seep: "#6b4210",
    aaIn: 0.52,
    aaOut: 2.15,
  },
  /** Session-end melt — sap yellow / orange lava flood over the core. */
  lavaFlood: {
    hot: "#f5d050",
    orangeBias: 0.48,
    mix: 0.94,
    emissionBoost: 0.78,
  },
  /**
   * Depth-driven orange core inside yellow veins (off at session visual start).
   */
  veinOrange: {
    color: "#f08028",
    /** Session progress gate — orange begins after this. */
    onset: 0.02,
    span: 0.38,
    /** Peak blend at full session progress. */
    maxMix: 0.94,
    /** <1 = wider orange core along vein; >1 = tighter center filament. */
    corePower: 0.48,
    emissionScale: 0.62,
  },
  /**
   * Stage 3 — G-channel cavity AO (rgb-compose.png).
   * Off at visual start; darkens cell interiors, not vein lines.
   */
  cellAo: {
    onset: 0.02,
    span: 0.48,
    maxStrength: 0.95,
    /** Darkest multiplier when AO bake is fully bright (cell center). */
    floor: 0.22,
    /** >1 = tighter cavity; <1 = broader soft darkening. */
    power: 0.92,
  },
} as const;

/** Snapshot of the pre-tweak calibrated core — copy values back to restore. */
export const IRON_CORE_REVERT_PRESET = {
  coreVisualDepthBase: 0.452,
  veinUvScaleStart: 1,
  veinDetailStrength: 1,
} as const;
