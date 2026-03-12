import { useEffect, useState, type PointerEvent } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { useFocusTimerContext } from "../../features/timer/TimerProvider";
import { formatMinutesHuman } from "../../lib/time";

const PRESETS = [30, 45, 60, 90, 120, 180];
const PLANNED_MINUTES_STORAGE_KEY = "zs-focus-timer-planned-minutes";

function getInitialPlannedMinutes(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PLANNED_MINUTES_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;
  if (parsed <= 0 || parsed > 180) return null;
  return parsed;
}

export function TimerPanel() {
  const { categories, addLogFromForm } = useAppState();
  const timer = useFocusTimerContext();
  const initialPlanned = getInitialPlannedMinutes();
  const [logTitle, setLogTitle] = useState("");
  const [logCategoryId, setLogCategoryId] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number>(
    initialPlanned ?? 30,
  );
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [plannedMinutes, setPlannedMinutes] = useState<number | null>(
    initialPlanned,
  );

  const baseAngleDeg = (customMinutes / 180) * 360;

  function updateCustomFromPointer(e: PointerEvent<HTMLButtonElement>) {
    if (!canAdjustDial) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angleRad = Math.atan2(dy, dx); // -PI..PI, 0 at +X, CCW
    let angleDeg = (angleRad * 180) / Math.PI; // -180..180
    // Shift so 0deg is at top (-Y) and increase clockwise 0..360
    angleDeg = (angleDeg + 450) % 360;
    const minutesRaw = (angleDeg / 360) * 180;
    // Snap to 1‑minute steps between 1 and 180.
    const snapped = Math.round(minutesRaw);
    const clamped = Math.max(1, Math.min(180, snapped));
    setCustomMinutes(clamped);
    setPlannedMinutes(clamped > 0 ? clamped : null);
  }

  function formatPlannedTime(minutes: number): string {
    const totalSeconds = minutes * 60;
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const two = (n: number) => n.toString().padStart(2, "0");
    return `${two(hrs)}:${two(mins)}:${two(secs)}`;
  }

  const showPlannedTime =
    !timer.isRunning &&
    !timer.sessionReadyToLog &&
    !timer.lastSession &&
    timer.mode === "idle" &&
    plannedMinutes !== null;

  const displayLabel = showPlannedTime
    ? formatPlannedTime(plannedMinutes)
    : timer.displayTime;

  const canAdjustDial =
    timer.mode === "idle" &&
    !timer.isRunning &&
    !timer.sessionReadyToLog &&
    !timer.lastSession;

  function playSingleBeep() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;

      const now = ctx.currentTime;
      const duration = 0.15;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(now + duration + 0.05);
      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch {
      // Ignore audio failures.
    }
  }

  // Play a short notification tone and desktop notification when a focus block finishes.
  useEffect(() => {
    if (!timer.sessionReadyToLog || !timer.lastSession) return;
    if (timer.lastSession.mode !== "focus") return;
    if (
      typeof timer.targetSeconds !== "number" ||
      timer.targetSeconds <= 0 ||
      timer.lastSession.durationSeconds !== timer.targetSeconds
    ) {
      // Only fire for automatically completed focus blocks (not manual stops).
      return;
    }
    if (typeof window === "undefined") return;

    // Audio cue: three short beeps.
    try {
      const AudioCtx =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = 880; // A5

        const now = ctx.currentTime;
        const beepDuration = 0.12;
        const gap = 0.06;

        // Start silent
        gain.gain.setValueAtTime(0.0001, now);

        // Schedule three beeps
        for (let i = 0; i < 3; i += 1) {
          const start = now + i * (beepDuration + gap);
          const peak = start + 0.02;
          const end = start + beepDuration;

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(0.2, peak);
          gain.gain.linearRampToValueAtTime(0.0001, end);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(now + 3 * (beepDuration + gap) + 0.05);

        osc.onended = () => {
          ctx.close().catch(() => {});
        };
      }
    } catch {
      // Ignore audio failures (e.g. browser policy).
    }

    // Desktop-style notification (browser / Tauri webview)
    try {
      if ("Notification" in window) {
        const show = () =>
          new Notification("IronFocus", {
            body: "Your focus block is complete.",
          });

        if (Notification.permission === "granted") {
          show();
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") show();
          });
        }
      }
    } catch {
      // Ignore notification failures.
    }
  }, [timer.sessionReadyToLog, timer.lastSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (plannedMinutes && plannedMinutes > 0) {
      window.localStorage.setItem(
        PLANNED_MINUTES_STORAGE_KEY,
        String(plannedMinutes),
      );
    } else {
      window.localStorage.removeItem(PLANNED_MINUTES_STORAGE_KEY);
    }
  }, [plannedMinutes]);

  function handleConvertToLog() {
    const session = timer.consumeSessionForLogging();
    if (!session) return;

    const minutes = Math.max(1, Math.round(session.durationSeconds / 60));

    const now = new Date();
    const toTimeValue = (d: Date) =>
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

    const startedAt = new Date(session.startedAt);
    const stoppedAt = session.stoppedAt ? new Date(session.stoppedAt) : now;

    const startTime = toTimeValue(startedAt);
    const endTime = toTimeValue(stoppedAt);

    const startFallback = new Date(now.getTime() - minutes * 60000);
    const startTimeSafe = endTime <= startTime ? toTimeValue(startFallback) : startTime;

    const result = addLogFromForm({
      title: logTitle || "Focus session",
      categoryId: logCategoryId,
      tagsRaw: "",
      startTime: startTimeSafe,
      endTime,
      notes: logNotes,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setLogTitle("");
    setLogCategoryId("");
    setLogNotes("");
  }

  const canConvert = timer.sessionReadyToLog && !!logCategoryId;
  const lastSessionMinutes = timer.lastSession
    ? Math.max(1, Math.round(timer.lastSession.durationSeconds / 60))
    : 0;

  return (
    <section className="zs-panel mb-4 border border-neutral-800 bg-neutral-900/80 p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
            Focus Timer
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Stopwatch & preset focus blocks
          </p>
        </div>
        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-500">
          Local
        </span>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col items-center gap-4 md:items-center">
          <div className="relative flex h-32 w-32 items-center justify-center md:h-40 md:w-40">
            <button
              type="button"
              onPointerDown={(e) => {
                if (!canAdjustDial) return;
                setIsDraggingDial(true);
                e.currentTarget.setPointerCapture(e.pointerId);
                updateCustomFromPointer(e);
              }}
              onPointerMove={(e) => {
                if (!isDraggingDial) return;
                updateCustomFromPointer(e);
              }}
              onPointerUp={(e) => {
                setIsDraggingDial(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              className={`relative flex h-full w-full items-center justify-center rounded-full border border-amber-500/60 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black shadow-[0_0_0_1px_rgba(15,23,42,0.9)] ${
                canAdjustDial ? "" : "cursor-default opacity-80"
              }`}
            >
              {(() => {
                // While a focus block is active or paused, drive the arc from remaining time.
                let dialAngleDeg = baseAngleDeg;
                let remainingMinutesForDial: number | null = null;
                if (
                  timer.mode === "focus" &&
                  typeof timer.targetSeconds === "number" &&
                  timer.targetSeconds > 0
                ) {
                  const total = timer.targetSeconds;
                  const remaining = Math.max(0, total - timer.elapsedSeconds);
                  const wholeMinutes = Math.round(remaining / 60);
                  const clampedMinutes = Math.max(0, Math.min(180, wholeMinutes));
                  remainingMinutesForDial = clampedMinutes;
                  dialAngleDeg = (clampedMinutes / 180) * 360;
                }

                const centerMinutes =
                  remainingMinutesForDial !== null
                    ? remainingMinutesForDial
                    : customMinutes;
                const bottomLabel =
                  remainingMinutesForDial !== null ? "MIN REMAINING" : "min";

                return (
                  <>
                    <div
                      className="absolute inset-[4px] rounded-full"
                      style={{
                        backgroundImage: `conic-gradient(#fbbf24 ${dialAngleDeg}deg, rgba(15,23,42,0.85) ${dialAngleDeg}deg)`,
                      }}
                    />
                    <div className="absolute inset-[12px] rounded-full bg-neutral-950/95 shadow-inner" />
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        Custom
                      </span>
                      <span className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">
                        {centerMinutes.toString().padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {bottomLabel}
                      </span>
                    </div>
                  </>
                );
              })()}
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 md:items-center">
            <div className="text-5xl font-semibold tabular-nums tracking-tight text-neutral-50">
              {displayLabel}
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Stopwatch / Focus
            </div>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (plannedMinutes && plannedMinutes > 0) {
                  timer.startPreset(plannedMinutes);
                } else {
                  timer.startStopwatch();
                }
              }}
              className="inline-flex min-w-[96px] items-center justify-center rounded-md border border-neutral-600 bg-neutral-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 shadow-sm hover:bg-white"
              disabled={timer.isRunning}
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => {
                if (timer.isRunning) {
                  playSingleBeep();
                }
                timer.stop();
              }}
              className="inline-flex min-w-[96px] items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300 hover:bg-neutral-800"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => timer.reset()}
              className="inline-flex min-w-[96px] items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 hover:bg-neutral-800"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-row items-start justify-center gap-3 md:mt-0 md:flex-col md:items-end">
          <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setPlannedMinutes(m);
                  setCustomMinutes(m);
                }}
                className={`min-w-[112px] rounded-full border px-5 py-2 text-xs font-semibold tracking-[0.2em] shadow-sm ${
                  plannedMinutes === m
                    ? "border-amber-500 bg-amber-500/15 text-amber-300"
                    : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-amber-600 hover:text-amber-400"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {timer.sessionReadyToLog && (
        <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-neutral-100">
              Convert last session to log
            </span>
            <span className="text-[11px] text-neutral-500">
              Duration: {formatMinutesHuman(lastSessionMinutes)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-400">
                Title
              </label>
              <input
                type="text"
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                placeholder="Focus session"
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-400">
                Category
              </label>
              <select
                value={logCategoryId}
                onChange={(e) => setLogCategoryId(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none focus:border-amber-500/70"
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="flex-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
            />
            <button
              type="button"
              onClick={handleConvertToLog}
              disabled={!canConvert}
              className="inline-flex items-center justify-center rounded-md border border-amber-500/60 bg-amber-600/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-950 shadow-sm transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
            >
              Save Log
            </button>
          </div>
          {error ? (
            <p className="mt-1 text-[11px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

