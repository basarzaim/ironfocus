import { useMemo } from "react";
import {
  Color,
  DoubleSide,
  ShaderMaterial,
  type Texture,
} from "three";

import {
  CORE_RAMP_BLACK_END,
  CORE_RAMP_BLACK_START,
  resolveCoreRampStops,
  resolveVeinFloodMix,
} from "./ironCoreRamp";
import {
  bootstrapIronVisualFrame,
  resolveCellAoStrength,
  resolveVeinDetailScale,
  resolveVeinOrangeStrength,
} from "./ironVisualState";
import { IRON_SCENE_TUNING } from "./ironVisualTuning";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D voronoiMap;
uniform float blackThreshold;
uniform float veinUvScale;
uniform float veinOrangeStrength;
uniform float veinOrangeCorePower;
uniform float veinOrangeEmission;
uniform float emissionStrength;
uniform float depthLeak;
uniform float glow;
uniform float heat;
uniform vec3 yellowColor;
uniform vec3 amberColor;
uniform vec3 orangeColor;
uniform vec3 shellColor;
uniform vec3 blackColor;
uniform vec3 seepColor;
uniform float aaInMul;
uniform float aaOutMul;
uniform float aoStrength;
uniform float aoFloor;
uniform float aoPower;
uniform float veinFlood;
uniform float floodMix;
uniform float floodEmissionBoost;
uniform vec3 floodHotColor;

varying vec2 vUv;

float sampleVoronoiFac(vec2 uv, float detailScale, float edge) {
  float raw = texture2D(voronoiMap, uv).r;
  if (abs(detailScale - 1.0) < 0.001) return raw;
  return clamp((raw - edge) * detailScale + edge, 0.0, 1.0);
}

// Stage 1: 4-stop ramp with asymmetric edge.
vec3 sampleCoreRamp(float fac, float edge, float aa) {
  float aaIn = max(aa * aaInMul, 0.0006);
  float aaOut = max(aa * aaOutMul, 0.0012);

  float veinHeat = 1.0 - smoothstep(edge * 0.38, max(edge - aaIn, edge * 0.52), fac);
  vec3 veinCol = mix(amberColor, yellowColor, veinHeat);

  float tOut = smoothstep(edge - aaIn * 0.35, edge + aaOut, fac);
  vec3 outCol = mix(veinCol, amberColor, smoothstep(0.0, 0.38, tOut));
  outCol = mix(outCol, shellColor, smoothstep(0.22, 0.72, tOut));
  outCol = mix(outCol, blackColor, smoothstep(0.58, 1.0, tOut));

  float veinMask = 1.0 - smoothstep(edge - aaIn, edge + aaOut, fac);
  return mix(outCol, veinCol, veinMask);
}

// Orange filament at vein center — masked by session depth on CPU (0 at visual start).
float veinCenterMask(float fac, float edge, float aaIn) {
  float upper = max(edge - aaIn * 0.4, edge * 0.52);
  float t = 1.0 - smoothstep(edge * 0.04, upper, fac);
  return pow(clamp(t, 0.0, 1.0), veinOrangeCorePower);
}

void main() {
  float edge = blackThreshold;
  float fac = sampleVoronoiFac(vUv, veinUvScale, edge);

  float aa = max(fwidth(fac) * 0.65, 0.0008);
  float aaIn = aa * aaInMul;
  vec3 col = sampleCoreRamp(fac, edge, aa);

  float veinMask = 1.0 - smoothstep(edge - aaIn, edge + aa * aaOutMul, fac);
  float center = veinCenterMask(fac, edge, aaIn);
  float orangeAmt = veinOrangeStrength * center * veinMask;

  col = mix(col, orangeColor, orangeAmt * 0.88);
  col += orangeColor * orangeAmt * veinOrangeEmission * (0.55 + glow * 0.35 + heat * 0.4);

  float seepRange = mix(0.014, 0.09, depthLeak);
  float seepEnd = blackThreshold + seepRange;
  float seep = 1.0 - smoothstep(blackThreshold * 0.55, seepEnd, fac);
  seep *= (1.0 - veinMask);
  float seepAmp = mix(0.1, 0.62, depthLeak) * (0.5 + glow * 0.32 + heat * 0.36);
  col += seepColor * seep * seepAmp;
  col += yellowColor * veinMask * (1.0 - orangeAmt * 0.65) * (0.28 + glow * 0.38 + heat * 0.32);

  // Stage 3: G = cavity AO — darken magma cell interiors (eases off near lava flood).
  float aoRaw = texture2D(voronoiMap, vUv).g;
  float cavity = pow(clamp(aoRaw, 0.0, 1.0), aoPower);
  float cellBody = smoothstep(edge + aaIn * 0.15, edge + aa * aaOutMul * 1.35, fac);
  float aoMul = mix(1.0, mix(aoFloor, 1.0, 1.0 - cavity), aoStrength * cellBody * (1.0 - veinFlood * 0.82));
  col *= aoMul;

  // Session end: voronoi melts into bright yellow-orange lava (not black fade).
  vec3 floodCol = mix(floodHotColor, orangeColor, floodMix);
  col = mix(col, floodCol, veinFlood * 0.93);
  col += floodCol * veinFlood * (0.38 + glow * 0.28 + heat * 0.32);

  gl_FragColor = vec4(col * emissionStrength * (1.0 + veinFlood * floodEmissionBoost), 1.0);
}
`;

export interface IronCoreMaterialUniforms {
  blackThreshold: number;
  glow: number;
  depthLeak?: number;
  veinUvScale?: number;
}

export function createIronCoreShaderMaterial(texture: Texture): ShaderMaterial {
  const ramp = IRON_SCENE_TUNING.coreRamp;
  const orange = IRON_SCENE_TUNING.veinOrange;
  const flood = IRON_SCENE_TUNING.lavaFlood;
  const cellAo = IRON_SCENE_TUNING.cellAo;
  const boot = bootstrapIronVisualFrame();
  const rampStops = resolveCoreRampStops(boot.depthParam);
  const orangeStrength = resolveVeinOrangeStrength(boot.depthParam);
  const aoStrength = resolveCellAoStrength(boot.depthParam);
  const veinFlood = resolveVeinFloodMix(boot.depthParam);

  const material = new ShaderMaterial({
    uniforms: {
      voronoiMap: { value: texture },
      blackThreshold: { value: rampStops.blackThreshold },
      veinUvScale: { value: resolveVeinDetailScale(boot.depthParam) },
      veinOrangeStrength: { value: orangeStrength },
      veinOrangeCorePower: { value: orange.corePower },
      veinOrangeEmission: { value: orange.emissionScale },
      emissionStrength: { value: 1.0 },
      depthLeak: { value: boot.depthParam },
      glow: { value: boot.glow },
      heat: { value: boot.ironHeat },
      yellowColor: { value: new Color(ramp.hot) },
      amberColor: { value: new Color(ramp.amber) },
      orangeColor: { value: new Color(orange.color) },
      shellColor: { value: new Color(ramp.shell) },
      blackColor: { value: new Color(ramp.deep) },
      seepColor: { value: new Color(ramp.seep) },
      aaInMul: { value: ramp.aaIn },
      aaOutMul: { value: ramp.aaOut },
      aoStrength: { value: aoStrength },
      aoFloor: { value: cellAo.floor },
      aoPower: { value: cellAo.power },
      veinFlood: { value: veinFlood },
      floodMix: { value: flood.orangeBias },
      floodEmissionBoost: { value: flood.emissionBoost },
      floodHotColor: { value: new Color(flood.hot) },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

  applyIronCoreUniforms(
    material,
    {
      blackThreshold: rampStops.blackThreshold,
      glow: boot.glow,
      depthLeak: boot.depthParam,
      veinUvScale: resolveVeinDetailScale(boot.depthParam),
    },
    boot.ironHeat,
  );

  return material;
}

function resolveDepthLeak(blackThreshold: number): number {
  const span = CORE_RAMP_BLACK_END - CORE_RAMP_BLACK_START;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (blackThreshold - CORE_RAMP_BLACK_START) / span));
}

export function applyIronCoreUniforms(
  material: ShaderMaterial,
  stops: IronCoreMaterialUniforms,
  heat: number,
): void {
  const depthLeak = stops.depthLeak ?? resolveDepthLeak(stops.blackThreshold);
  const depthParam = stops.depthLeak ?? depthLeak;

  material.uniforms.blackThreshold.value = stops.blackThreshold;
  material.uniforms.veinUvScale.value = stops.veinUvScale ?? 1;
  material.uniforms.depthLeak.value = depthLeak;
  material.uniforms.glow.value = stops.glow;
  material.uniforms.heat.value = heat;
  material.uniforms.veinOrangeStrength.value = resolveVeinOrangeStrength(depthParam);
  material.uniforms.aoStrength.value = resolveCellAoStrength(depthParam);
  material.uniforms.veinFlood.value = resolveVeinFloodMix(depthParam);
  material.uniforms.emissionStrength.value =
    0.9 + stops.glow * (0.5 + heat * 0.38) + depthLeak * 0.28;

  const yellow = material.uniforms.yellowColor.value as Color;
  yellow.setRGB(
    0.9 + heat * 0.08 + depthLeak * 0.06,
    0.64 + heat * 0.14 + depthLeak * 0.08,
    0.14 + heat * 0.05,
  );

  const amber = material.uniforms.amberColor.value as Color;
  amber.setRGB(
    0.52 + heat * 0.06 + depthLeak * 0.04,
    0.34 + heat * 0.08 + depthLeak * 0.05,
    0.08 + heat * 0.02,
  );

  const orange = material.uniforms.orangeColor.value as Color;
  orange.setRGB(
    0.88 + heat * 0.08 + depthLeak * 0.04,
    0.44 + heat * 0.14 + depthLeak * 0.08,
    0.12 + heat * 0.05,
  );
}

export function useIronCoreShaderMaterial(texture: Texture | null): ShaderMaterial | null {
  return useMemo(() => {
    if (!texture) return null;
    return createIronCoreShaderMaterial(texture);
  }, [texture]);
}
