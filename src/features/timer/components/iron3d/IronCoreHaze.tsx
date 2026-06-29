import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  type Group,
  type Mesh,
} from "three";
import type { RefObject } from "react";
import { resolveAuraDepthGate, type IronVisualFrame } from "../../iron/ironVisualState";

const DISC_RADIUS = 1.52;

function resolveNebulaIntensity(frame: IronVisualFrame): number {
  const depthGate = resolveAuraDepthGate(frame.depthParam);
  const statusMul =
    frame.status === "running"
      ? 1
      : frame.status === "paused"
        ? 0.65
        : frame.status === "finished"
          ? 0.95
          : 0.22;
  const base = 0.5 + frame.ironHeat * 0.72 + frame.glow * 0.35;
  return Math.min(1.4, depthGate * statusMul * base + depthGate * 0.12);
}

const vertexShader = /* glsl */ `
varying vec2 vLocalXY;
varying vec3 vViewDir;
varying vec3 vNormal;

void main() {
  vLocalXY = position.xy;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform float uIntensity;
uniform float uTime;
uniform float uLayer;
uniform float uArmCount;
uniform float uTwist;
uniform vec3 uArmColor;
uniform vec3 uDustColor;
uniform float uDiscRadius;

varying vec2 vLocalXY;
varying vec3 vViewDir;
varying vec3 vNormal;

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p = p * 2.05 + vec3(0.21, 0.17, 0.29);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vLocalXY;
  float r = length(p);
  float edge = smoothstep(uDiscRadius, uDiscRadius * 0.72, r);
  if (edge < 0.001) discard;

  float a = atan(p.y, p.x);
  float twist = log(max(r, 0.14)) * uTwist;
  float spiralPhase = a * uArmCount + twist - uTime * (0.14 + uLayer * 0.05);
  float spiral = sin(spiralPhase);
  float armBand = pow(clamp(0.5 + 0.5 * spiral, 0.0, 1.0), 2.2);

  float coreGlow = smoothstep(0.55, 0.08, r);
  float radial = smoothstep(uDiscRadius, 0.35, r) * smoothstep(0.1, 0.38, r);

  vec3 nPos = vec3(p * (2.8 + uLayer * 0.5), uLayer * 1.7 + uTime * 0.06);
  float n = fbm(nPos);
  float wisps = smoothstep(0.3, 0.9, n);

  float density = radial * (armBand * (0.42 + wisps * 0.58) + coreGlow * 0.22);
  density *= edge;

  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vViewDir)), 1.35);
  density *= 0.72 + fresnel * 0.38;

  vec3 col = mix(uDustColor, uArmColor, clamp(armBand * 1.15 + coreGlow * 0.35, 0.0, 1.0));
  col += uArmColor * wisps * armBand * 0.25;

  float alpha = density * uIntensity * (0.36 + uLayer * 0.07);
  gl_FragColor = vec4(col, alpha);
}
`;

interface SpiralDiscProps {
  layer: number;
  armCount: number;
  twist: number;
  armColor: string;
  dustColor: string;
  rotationZ: number;
  scale: number;
  intensityRef: RefObject<number>;
  reduced: boolean;
}

function SpiralDisc({
  layer,
  armCount,
  twist,
  armColor,
  dustColor,
  rotationZ,
  scale,
  intensityRef,
  reduced,
}: SpiralDiscProps) {
  const meshRef = useRef<Mesh>(null);
  const timeRef = useRef(0);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uIntensity: { value: 0 },
          uTime: { value: 0 },
          uLayer: { value: layer },
          uArmCount: { value: armCount },
          uTwist: { value: twist },
          uArmColor: { value: new Color(armColor) },
          uDustColor: { value: new Color(dustColor) },
          uDiscRadius: { value: DISC_RADIUS },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [armColor, armCount, dustColor, layer, twist],
  );

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (!reduced) timeRef.current += delta;
    material.uniforms.uTime.value = timeRef.current;
    material.uniforms.uIntensity.value = intensityRef.current ?? 0;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[0, 0, rotationZ]}
      scale={[scale, scale, 1]}
      material={material}
    >
      <circleGeometry args={[DISC_RADIUS, 96]} />
    </mesh>
  );
}

interface IronCoreHazeProps {
  frameRef: RefObject<IronVisualFrame | null>;
  reduced: boolean;
}

/** Spiral galaxy-style gas / dust around the core. */
export function IronCoreHaze({ frameRef, reduced }: IronCoreHazeProps) {
  const galaxyRef = useRef<Group>(null);
  const intensityRef = useRef(0);
  const spinRef = useRef(0);

  useFrame((_, delta) => {
    const frame = frameRef.current;
    intensityRef.current = frame ? resolveNebulaIntensity(frame) : 0;

    if (!reduced && galaxyRef.current) {
      spinRef.current += delta * 0.065;
      galaxyRef.current.rotation.y = spinRef.current;
    }
  });

  return (
    <group
      ref={galaxyRef}
      rotation={[0.58, 0.32, 0.22]}
      renderOrder={2}
    >
      <SpiralDisc
        layer={0}
        armCount={2.0}
        twist={2.65}
        armColor="#d4a858"
        dustColor="#5a4868"
        rotationZ={0}
        scale={1}
        intensityRef={intensityRef}
        reduced={reduced}
      />
      <SpiralDisc
        layer={1}
        armCount={2.4}
        twist={2.95}
        armColor="#c09048"
        dustColor="#484858"
        rotationZ={1.12}
        scale={0.94}
        intensityRef={intensityRef}
        reduced={reduced}
      />
      <group rotation={[1.38, 0.42, 0]}>
        <SpiralDisc
          layer={2}
          armCount={1.8}
          twist={2.35}
          armColor="#b88850"
          dustColor="#625878"
          rotationZ={-0.65}
          scale={0.88}
          intensityRef={intensityRef}
          reduced={reduced}
        />
      </group>
    </group>
  );
}
