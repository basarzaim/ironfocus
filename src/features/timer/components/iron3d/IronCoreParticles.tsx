import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  NormalBlending,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
  Matrix4,
  type Points as PointsType,
} from "three";
import type { RefObject } from "react";
import { resolveAuraDepthGate, type IronVisualFrame } from "../../iron/ironVisualState";
import { getIronThemePalette } from "../../iron/ironThemePalettes";
import { useTheme } from "../../../../state/ThemeProvider";

const DUST_COUNT = 180;
const EMBER_COUNT = 96;
const VIEW_POS = new Vector3();
const WORLD_POS = new Vector3();

/** Radial gradient sprite — round soft dots instead of square GL points. */
function createSoftSpriteTexture(softCore = 0.22): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");

  const half = size / 2;
  const grd = ctx.createRadialGradient(half, half, 0, half, half, half);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(softCore, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.12)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface DustParticle {
  theta: number;
  phi: number;
  radius: number;
  angVel: number;
  wobble: number;
  warmth: number;
}

interface EmberParticle {
  theta: number;
  phi: number;
  radius: number;
  drift: number;
  lift: number;
  life: number;
  maxLife: number;
  warmth: number;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mkDust(): DustParticle {
  return {
    theta: rand(0, Math.PI * 2),
    phi: rand(0.15, Math.PI - 0.15),
    radius: rand(1.12, 1.88),
    angVel: rand(0.06, 0.2) * (Math.random() > 0.5 ? 1 : -1),
    wobble: rand(0, Math.PI * 2),
    warmth: rand(0.35, 1),
  };
}

function mkEmber(): EmberParticle {
  const theta = rand(0, Math.PI * 2);
  const phi = rand(0.2, Math.PI - 0.2);
  const radius = rand(0.96, 1.22);
  return {
    theta,
    phi,
    radius,
    drift: rand(0.05, 0.16),
    lift: rand(0.02, 0.08),
    life: rand(0.2, 1),
    maxLife: rand(1.4, 2.8),
    warmth: rand(0.5, 1),
  };
}

function sphericalToCartesian(
  theta: number,
  phi: number,
  radius: number,
  shellLayer = 0,
): [number, number, number] {
  const sinPhi = Math.sin(phi);
  const x = radius * sinPhi * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * sinPhi * Math.sin(theta);
  const layerStretch = 1 + shellLayer * 0.08;
  const depthBulge = 1 + Math.sin(phi * 2.1 + theta * 0.5) * 0.06 * shellLayer;
  return [x * layerStretch * depthBulge, y, z * layerStretch];
}

function resolveAuraIntensity(frame: IronVisualFrame): number {
  const depthGate = resolveAuraDepthGate(frame.depthParam);
  const statusMul =
    frame.status === "running"
      ? 1
      : frame.status === "paused"
        ? 0.6
        : frame.status === "finished"
          ? 0.95
          : 0.18;
  return depthGate * statusMul * (0.42 + frame.ironHeat * 0.62 + frame.glow * 0.32);
}

function resolveViewDepthFade(
  localX: number,
  localY: number,
  localZ: number,
  parent: PointsType | null,
  cameraMatrixWorldInverse: Matrix4,
): number {
  if (!parent) return 1;
  WORLD_POS.set(localX, localY, localZ);
  parent.localToWorld(WORLD_POS);
  VIEW_POS.copy(WORLD_POS).applyMatrix4(cameraMatrixWorldInverse);
  return clamp01(0.28 + (-VIEW_POS.z - 3.8) * 0.14);
}

function makeSoftPointsMaterial(
  sprite: CanvasTexture,
  blending: typeof NormalBlending | typeof AdditiveBlending,
  size: number,
  opacity: number,
): PointsMaterial {
  return new PointsMaterial({
    map: sprite,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending,
    vertexColors: true,
    sizeAttenuation: true,
    alphaTest: 0.02,
  });
}

interface IronCoreParticlesProps {
  frameRef: RefObject<IronVisualFrame | null>;
  reduced: boolean;
}

export function IronCoreParticles({ frameRef, reduced }: IronCoreParticlesProps) {
  const { accentId } = useTheme();
  const baseHue = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 };
    new Color(getIronThemePalette(accentId).orange).getHSL(hsl);
    return hsl.h;
  }, [accentId]);

  const dustRef = useRef<PointsType>(null);
  const emberRef = useRef<PointsType>(null);
  const dustState = useRef(Array.from({ length: DUST_COUNT }, mkDust));
  const emberState = useRef(Array.from({ length: EMBER_COUNT }, mkEmber));

  const dustSprite = useMemo(() => createSoftSpriteTexture(0.18), []);
  const emberSprite = useMemo(() => createSoftSpriteTexture(0.12), []);

  useEffect(() => {
    return () => {
      dustSprite.dispose();
      emberSprite.dispose();
    };
  }, [dustSprite, emberSprite]);

  const dustGeo = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(DUST_COUNT * 3), 3));
    geo.setAttribute("color", new BufferAttribute(new Float32Array(DUST_COUNT * 3), 3));
    return geo;
  }, []);

  const emberGeo = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(EMBER_COUNT * 3), 3));
    geo.setAttribute("color", new BufferAttribute(new Float32Array(EMBER_COUNT * 3), 3));
    return geo;
  }, []);

  const dustMat = useMemo(
    () => makeSoftPointsMaterial(dustSprite, NormalBlending, 0.13, 0.65),
    [dustSprite],
  );

  const emberMat = useMemo(
    () => makeSoftPointsMaterial(emberSprite, AdditiveBlending, 0.055, 0.95),
    [emberSprite],
  );

  useFrame((state, delta) => {
    const frame = frameRef.current;
    if (!frame || !dustRef.current || !emberRef.current) return;

    const intensity = resolveAuraIntensity(frame);
    const spin = reduced ? 0 : delta * 0.22;
    const time = state.clock.elapsedTime;
    const camInv = state.camera.matrixWorldInverse;

    const dustPos = dustGeo.attributes.position.array as Float32Array;
    const dustCol = dustGeo.attributes.color.array as Float32Array;
    const dustActive = Math.floor(DUST_COUNT * clamp01(intensity * 1.35));

    for (let i = 0; i < DUST_COUNT; i++) {
      const p = dustState.current[i];
      const i3 = i * 3;

      if (i >= dustActive) {
        dustPos[i3 + 1] = 999;
        continue;
      }

      if (!reduced) {
        p.theta += p.angVel * delta * (0.55 + frame.ironHeat * 0.45);
        p.wobble += delta * 0.55;
      }

      const wobbleR =
        p.radius +
        Math.sin(p.wobble) * 0.09 * (0.45 + frame.ironHeat * 0.65) +
        Math.sin(time * 0.35 + p.theta) * 0.05;
      const shellLayer = (i % 5) / 4;
      const [x, y, z] = sphericalToCartesian(p.theta + spin, p.phi, wobbleR, shellLayer);
      dustPos[i3] = x;
      dustPos[i3 + 1] = y;
      dustPos[i3 + 2] = z;

      const depthFade = resolveViewDepthFade(x, y, z, dustRef.current, camInv);
      const radialDepth = clamp01((wobbleR - 0.95) / 0.85);
      const fade = clamp01(intensity * p.warmth * 1.15 * depthFade * (0.55 + radialDepth * 0.55));
      const c = new Color().setHSL(baseHue + 0.02 + p.warmth * 0.04, 0.38, 0.24 + fade * 0.2);
      dustCol[i3] = c.r * fade;
      dustCol[i3 + 1] = c.g * fade;
      dustCol[i3 + 2] = c.b * fade;
    }

    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
    dustGeo.setDrawRange(0, dustActive);
    dustMat.opacity = 0.22 + intensity * 0.48;
    dustMat.size = 0.07 + intensity * 0.12;

    const emberPos = emberGeo.attributes.position.array as Float32Array;
    const emberCol = emberGeo.attributes.color.array as Float32Array;
    const emberActive = Math.floor(EMBER_COUNT * clamp01(intensity * 1.28));

    for (let i = 0; i < EMBER_COUNT; i++) {
      const p = emberState.current[i];
      const i3 = i * 3;

      if (i >= emberActive) {
        emberPos[i3 + 1] = 999;
        continue;
      }

      if (!reduced) {
        p.life -= delta;
        p.radius += p.drift * delta * (0.45 + frame.ironHeat * 0.75);
        p.phi = Math.max(0.1, p.phi - p.lift * delta * 0.16);
        p.theta += delta * 0.09;

        if (p.life <= 0 || p.radius > 2.05) {
          emberState.current[i] = mkEmber();
          continue;
        }
      }

      const shellLayer = 0.35 + (i % 7) / 6;
      const [x, y, z] = sphericalToCartesian(p.theta, p.phi, p.radius, shellLayer);
      emberPos[i3] = x;
      emberPos[i3 + 1] = y;
      emberPos[i3 + 2] = z;

      const depthFade = resolveViewDepthFade(x, y, z, emberRef.current, camInv);
      const lifeFade = clamp01(p.life / p.maxLife);
      const radialDepth = clamp01((p.radius - 0.9) / 0.95);
      const fade = clamp01(
        intensity * p.warmth * lifeFade * 1.2 * depthFade * (0.5 + radialDepth * 0.65),
      );
      const c = new Color().setHSL(baseHue + p.warmth * 0.05, 0.88, 0.48 + fade * 0.28);
      emberCol[i3] = c.r * fade;
      emberCol[i3 + 1] = c.g * fade;
      emberCol[i3 + 2] = c.b * fade * 0.35;
    }

    emberGeo.attributes.position.needsUpdate = true;
    emberGeo.attributes.color.needsUpdate = true;
    emberGeo.setDrawRange(0, emberActive);
    emberMat.opacity = 0.38 + intensity * 0.58;
    emberMat.size = 0.028 + intensity * 0.042;
  });

  return (
    <group renderOrder={3}>
      <points ref={dustRef} geometry={dustGeo} material={dustMat} frustumCulled={false} />
      <points ref={emberRef} geometry={emberGeo} material={emberMat} frustumCulled={false} />
    </group>
  );
}
