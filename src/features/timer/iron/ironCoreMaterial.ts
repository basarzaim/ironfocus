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
} from "./ironCoreRamp";

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
uniform float emissionStrength;
uniform float depthLeak;
uniform float glow;
uniform float heat;
uniform vec3 yellowColor;
uniform vec3 blackColor;

varying vec2 vUv;

// Sharpen distance field around the live ramp edge — no UV tiling / smear.
float sampleVoronoiFac(vec2 uv, float detailScale, float edge) {
  float raw = texture2D(voronoiMap, uv).r;
  if (abs(detailScale - 1.0) < 0.001) return raw;
  return clamp((raw - edge) * detailScale + edge, 0.0, 1.0);
}

void main() {
  float edge = blackThreshold;
  float fac = sampleVoronoiFac(vUv, veinUvScale, edge);

  // Blender Constant ramp — narrow derivative band for rotation stability.
  float aa = max(fwidth(fac) * 0.65, 0.0008);
  float vein = 1.0 - smoothstep(edge - aa, edge + aa, fac);
  vec3 col = mix(blackColor, yellowColor, vein);

  float seepRange = mix(0.014, 0.09, depthLeak);
  float seepEnd = blackThreshold + seepRange;
  float seep = 1.0 - smoothstep(blackThreshold * 0.55, seepEnd, fac);
  seep *= (1.0 - vein);
  float seepAmp = mix(0.12, 0.72, depthLeak) * (0.55 + glow * 0.35 + heat * 0.4);
  col += yellowColor * seep * seepAmp;
  col += yellowColor * vein * (0.3 + glow * 0.4 + heat * 0.35);

  gl_FragColor = vec4(col * emissionStrength, 1.0);
}
`;

export interface IronCoreMaterialUniforms {
  blackThreshold: number;
  glow: number;
  depthLeak?: number;
  veinUvScale?: number;
}

export function createIronCoreShaderMaterial(texture: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      voronoiMap: { value: texture },
      blackThreshold: { value: CORE_RAMP_BLACK_START },
      veinUvScale: { value: 1 },
      emissionStrength: { value: 1.0 },
      depthLeak: { value: 0 },
      glow: { value: 0.4 },
      heat: { value: 0 },
      yellowColor: { value: new Color("#e8b450") },
      blackColor: { value: new Color("#0a0806") },
    },
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });
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

  material.uniforms.blackThreshold.value = stops.blackThreshold;
  material.uniforms.veinUvScale.value = stops.veinUvScale ?? 1;
  material.uniforms.depthLeak.value = depthLeak;
  material.uniforms.glow.value = stops.glow;
  material.uniforms.heat.value = heat;
  material.uniforms.emissionStrength.value =
    0.9 + stops.glow * (0.5 + heat * 0.38) + depthLeak * 0.28;

  const yellow = material.uniforms.yellowColor.value as Color;
  yellow.setRGB(
    0.9 + heat * 0.08 + depthLeak * 0.06,
    0.64 + heat * 0.14 + depthLeak * 0.08,
    0.14 + heat * 0.05,
  );
}

export function useIronCoreShaderMaterial(texture: Texture | null): ShaderMaterial | null {
  return useMemo(() => {
    if (!texture) return null;
    return createIronCoreShaderMaterial(texture);
  }, [texture]);
}
