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
   * Session-start vein sharpening (>1 = thinner veins). Eases to 1.0 with depth.
   * Shader pivots on blackThreshold, not UV — no bake edge smear.
   *
   * Revert preset (2026-06-30 calibrated look):
   *   coreVisualDepthBase: 0.452, veinUvScaleStart: 1, veinDetailStrength: 1
   */
  veinUvScaleStart: 1.1,
  /** Multiplies (veinUvScaleStart - 1) for a visible but safe thinning range. */
  veinDetailStrength: 8.5,
} as const;

/** Snapshot of the pre-tweak calibrated core — copy values back to restore. */
export const IRON_CORE_REVERT_PRESET = {
  coreVisualDepthBase: 0.452,
  veinUvScaleStart: 1,
  veinDetailStrength: 1,
} as const;
