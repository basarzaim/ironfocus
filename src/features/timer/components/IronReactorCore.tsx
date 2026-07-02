import type { FC } from "react";
import type { ReactorCoreProps } from "./ReactorCore";
import { ACCENT_TIMER_OVERLAY } from "../../../lib/accentStyles";
import { IronCoreCanvas } from "./iron3d/IronCoreCanvas";

export interface IronReactorCoreProps extends Omit<ReactorCoreProps, "visualStyle"> {}

/**
 * Iron Core — WebGL + Blender GLB + VoronoiPattern_Bake2 (UV distance map).
 */
export const IronReactorCore: FC<IronReactorCoreProps> = ({
  mode,
  isRunning,
  elapsedSeconds,
  targetSeconds,
  displayTime,
  className = "relative h-72 w-72",
  showTimer = true,
}) => {
  const timer = { mode, isRunning, elapsedSeconds, targetSeconds };

  return (
    <div className={className}>
      <IronCoreCanvas timer={timer} className="absolute inset-0" />
      {showTimer && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-live="polite"
          aria-label={`Timer: ${displayTime}`}
        >
          <span className={ACCENT_TIMER_OVERLAY}>
            {displayTime}
          </span>
        </div>
      )}
    </div>
  );
};
