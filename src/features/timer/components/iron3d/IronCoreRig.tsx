import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  type ShaderMaterial,
} from "three";
import type { RefObject } from "react";
import { refineCoreMeshGeometry } from "../../iron/ironCoreGeometry";
import { resolveCoreRampStops } from "../../iron/ironCoreRamp";
import {
  applyIronCoreUniforms,
  useIronCoreShaderMaterial,
} from "../../iron/ironCoreMaterial";
import {
  configureVoronoiDataTexture,
  VORONOI_BAKE_URL,
} from "../../iron/ironCoreTexture";
import { resolveShellLevel } from "../../iron/ironShellLevels";
import { useTheme } from "../../../../state/ThemeProvider";
import {
  type IronAnimState,
  type IronCoreStatus,
  type IronTimerInput,
  type IronVisualFrame,
  stepIronVisual,
  CORE_BASE_SCALE,
  resolveVeinDetailScale,
} from "../../iron/ironVisualState";
import { IRON_SCENE_TUNING } from "../../iron/ironVisualTuning";
import { IronCoreParticles } from "./IronCoreParticles";
import { IronCoreHaze } from "./IronCoreHaze";

const SHELL_MODEL_URL = "/models/cracked_shell.glb";
const CORE_MODEL_URL = "/models/iron_core.glb";

useGLTF.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
useTexture.preload(VORONOI_BAKE_URL);

interface IronCoreRigProps {
  timerRef: RefObject<IronTimerInput>;
  frameRef: RefObject<IronVisualFrame | null>;
  reducedMotion: boolean;
  lowQuality: boolean;
}

function stripVertexColors(mesh: Mesh): void {
  const attrs = mesh.geometry.attributes;
  for (const key of Object.keys(attrs)) {
    if (key === "color" || key.startsWith("color")) {
      mesh.geometry.deleteAttribute(key);
    }
  }
}

function shellRpm(status: IronCoreStatus): number {
  return IRON_SCENE_TUNING.shellSpin[status];
}

export function IronCoreRig({
  timerRef,
  frameRef,
  reducedMotion,
  lowQuality,
}: IronCoreRigProps) {
  const rootRef = useRef<Group>(null);
  const modelGroupRef = useRef<Group>(null);
  const shellMeshesRef = useRef<Map<number, Mesh>>(new Map());
  const coreMaterialRef = useRef<ShaderMaterial | null>(null);
  const activeShellRef = useRef(-1);
  const maxShellLevelRef = useRef(0);
  const shellSpinRef = useRef(0);

  const animRef = useRef<IronAnimState>({ t: 0, coreScale: CORE_BASE_SCALE, precession: 0 });

  const { accentId } = useTheme();
  const { scene: shellScene } = useGLTF(SHELL_MODEL_URL);
  const { scene: coreScene } = useGLTF(CORE_MODEL_URL);
  const voronoiTex = useTexture(VORONOI_BAKE_URL);
  const coreShaderMat = useIronCoreShaderMaterial(voronoiTex, accentId);

  const shellMaterial = useMemo(() => {
    const t = IRON_SCENE_TUNING.shell;
    return new MeshStandardMaterial({
      color: t.color,
      metalness: t.metalness,
      roughness: t.roughness,
      envMapIntensity: t.envMapIntensity,
      emissive: t.emissive,
      emissiveIntensity: t.emissiveIntensity,
      side: DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
    });
  }, []);

  const rig = useMemo(() => {
    if (!coreShaderMat) return null;

    const group = new Group();
    const shells = new Map<number, Mesh>();

    const shellRoot = shellScene.clone(true);
    shellRoot.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      if (!obj.name.startsWith("ShellLevel_")) return;

      const suffix = obj.name.slice("ShellLevel_".length);
      const index = Number.parseInt(suffix, 10);
      if (Number.isNaN(index)) return;

      stripVertexColors(obj);
      obj.material = shellMaterial;
      obj.visible = false;
      shells.set(index, obj);
    });
    group.add(shellRoot);

    const coreRoot = coreScene.clone(true);
    coreRoot.traverse((obj) => {
      if (!(obj instanceof Mesh) || obj.name !== "core") return;
      refineCoreMeshGeometry(obj);
      obj.material = coreShaderMat;
      group.add(obj);
    });

    const level0 = shells.get(0);
    if (level0) level0.visible = true;

    return { group, shells };
  }, [shellScene, coreScene, coreShaderMat, shellMaterial]);

  useEffect(() => {
    configureVoronoiDataTexture(voronoiTex);
  }, [voronoiTex]);

  useEffect(() => {
    if (!rig || !coreShaderMat) return;

    shellMeshesRef.current = rig.shells;
    coreMaterialRef.current = coreShaderMat;
    activeShellRef.current = 0;
    maxShellLevelRef.current = Math.max(0, ...rig.shells.keys());
  }, [rig, coreShaderMat]);

  useFrame((_, delta) => {
    const dt = Math.min(delta * 1000, 50);
    const input = timerRef.current;
    if (!input) return;

    const frame = stepIronVisual(animRef.current, input, dt, reducedMotion);
    frameRef.current = frame;

    const breathMul =
      frame.status === "idle" ? 1 : 1 + frame.breath * frame.breathExpand;
    rootRef.current?.scale.setScalar(frame.coreScale * breathMul);

    const shellLevel = Math.min(
      resolveShellLevel(frame.shellDepthParam),
      maxShellLevelRef.current,
    );
    if (shellLevel !== activeShellRef.current) {
      const prev = shellMeshesRef.current.get(activeShellRef.current);
      const next = shellMeshesRef.current.get(shellLevel);
      if (prev) prev.visible = false;
      if (next) {
        next.visible = true;
        activeShellRef.current = shellLevel;
      }
    }

    if (!reducedMotion && modelGroupRef.current) {
      const rpm = shellRpm(frame.status);
      shellSpinRef.current += (delta * Math.PI * 2 * rpm) / 60;
      modelGroupRef.current.rotation.y = shellSpinRef.current;
    }

    const ramp = resolveCoreRampStops(frame.depthParam);
    const mat = coreMaterialRef.current;
    if (mat) {
      applyIronCoreUniforms(
        mat,
        {
          blackThreshold: ramp.blackThreshold,
          glow: frame.glow,
          depthLeak: frame.depthParam,
          veinUvScale: resolveVeinDetailScale(frame.depthParam),
        },
        frame.ironHeat,
        accentId,
      );
    }
  });

  return (
    <group ref={rootRef}>
      {rig && <primitive ref={modelGroupRef} object={rig.group} />}
      {rig && !lowQuality ? (
        <>
          <IronCoreHaze frameRef={frameRef} reduced={reducedMotion} />
          <IronCoreParticles frameRef={frameRef} reduced={reducedMotion} />
        </>
      ) : null}
    </group>
  );
}

useGLTF.preload(SHELL_MODEL_URL);
useGLTF.preload(CORE_MODEL_URL);
