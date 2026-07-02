import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import type { IronTimerInput, IronVisualFrame } from "../../iron/ironVisualState";
import { IRON_SCENE_TUNING } from "../../iron/ironVisualTuning";
import { resolveVisualQuality } from "../../../../lib/userPreferences";
import { usePreferences } from "../../../../state/PreferencesProvider";
import { IronCoreRig } from "./IronCoreRig";

interface IronCoreSceneProps {
  timerRef: React.RefObject<IronTimerInput>;
  frameRef: React.RefObject<IronVisualFrame | null>;
  reducedMotion: boolean;
  lowQuality: boolean;
}

function IronBloom({ frameRef }: { frameRef: React.RefObject<IronVisualFrame | null> }) {
  const [intensity, setIntensity] = useState(0.25);
  const bloom = IRON_SCENE_TUNING.bloom;

  useFrame(() => {
    const frame = frameRef.current;
    const glow = frame?.glow ?? 0;
    const heat = frame?.ironHeat ?? 0;
    const depth = frame?.depthParam ?? 0;
    const target =
      bloom.base +
      glow * bloom.glowScale +
      heat * bloom.heatScale +
      depth * bloom.depthScale;

    setIntensity((prev) => prev + (target - prev) * 0.08);
  });

  return (
    <Bloom
      intensity={intensity}
      luminanceThreshold={bloom.threshold}
      luminanceSmoothing={0.9}
      mipmapBlur
    />
  );
}

function IronCoreScene({
  timerRef,
  frameRef,
  reducedMotion,
  lowQuality,
}: IronCoreSceneProps) {
  const lights = IRON_SCENE_TUNING.lights;
  const envIntensity = lowQuality
    ? IRON_SCENE_TUNING.environmentIntensity * 0.72
    : IRON_SCENE_TUNING.environmentIntensity;

  return (
    <>
      <ambientLight
        intensity={lowQuality ? lights.ambient * 1.15 : lights.ambient}
        color="#b9a78e"
      />
      <hemisphereLight args={["#d2b995", "#2a2219", lights.hemisphere]} />
      <pointLight position={[-3.8, 3.2, 5.2]} intensity={lights.key} color="#f7deb2" />
      <pointLight position={[2.1, 1.1, 3.4]} intensity={lights.fill} color="#d49b31" />
      <pointLight position={[0, -2.6, 2.3]} intensity={lights.rim} color="#4a3f31" />
      <Environment
        preset="studio"
        environmentIntensity={envIntensity}
        background={false}
      />

      <IronCoreRig
        timerRef={timerRef}
        frameRef={frameRef}
        reducedMotion={reducedMotion}
        lowQuality={lowQuality}
      />

      {!lowQuality ? (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <IronBloom frameRef={frameRef} />
        </EffectComposer>
      ) : null}
    </>
  );
}

export interface IronCoreCanvasProps {
  timer: IronTimerInput;
  className?: string;
}

export function IronCoreCanvas({ timer, className }: IronCoreCanvasProps) {
  const timerRef = useRef(timer);
  const frameRef = useRef<IronVisualFrame | null>(null);
  const { preferences } = usePreferences();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  timerRef.current = timer;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const lowQuality =
    resolveVisualQuality(preferences.visualQuality, false) === "low";

  return (
    <div className={className}>
      <Canvas
        className="absolute inset-0 h-full w-full"
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [-2.0, 1.4, 5.4], fov: 38, near: 0.1, far: 100 }}
        dpr={lowQuality ? 1 : [1, IRON_SCENE_TUNING.render.dprMax]}
        style={{ background: "transparent" }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          gl.outputColorSpace = SRGBColorSpace;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = IRON_SCENE_TUNING.exposure;
          camera.lookAt(0, 0, 0);
        }}
      >
        <Suspense fallback={null}>
          <IronCoreScene
            timerRef={timerRef}
            frameRef={frameRef}
            reducedMotion={prefersReducedMotion}
            lowQuality={lowQuality}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
