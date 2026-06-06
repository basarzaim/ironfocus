import { useEffect, useState, type PointerEvent } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { useFocusTimerContext } from "../../features/timer/TimerProvider";
import { useTheme } from "../../state/ThemeProvider";
import { formatMinutesHuman } from "../../lib/time";
import { shouldPlayFocusAutoCompleteNotify } from "../../lib/focusCompletionNotificationDedup";

const PRESETS = [30, 45, 60, 90, 120, 180];
const PLANNED_MINUTES_STORAGE_KEY = "ironfocus-timer-planned-minutes";

type TimerPanelProps = {
  focusMode: boolean;
  onToggleFocusMode: () => void;
};

function getInitialPlannedMinutes(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PLANNED_MINUTES_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return null;
  if (parsed <= 0 || parsed > 180) return null;
  return parsed;
}

export function TimerPanel({
  focusMode,
  onToggleFocusMode,
}: TimerPanelProps) {
  const { categories, addLogFromForm } = useAppState();
  const timer = useFocusTimerContext();
  const initialPlanned = getInitialPlannedMinutes();
  const [logTitle, setLogTitle] = useState("");
  const [logCategoryId, setLogCategoryId] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plannedCategoryId, setPlannedCategoryId] = useState("");
  const [uiMode, setUiMode] = useState<"timer" | "stopwatch">("timer");
  const [customMinutes, setCustomMinutes] = useState<number>(
    initialPlanned ?? 30,
  );
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [plannedMinutes, setPlannedMinutes] = useState<number | null>(
    initialPlanned ?? 30,
  );
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [showDiscardSessionModal, setShowDiscardSessionModal] = useState(false);

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
    uiMode === "timer" &&
    !timer.isRunning &&
    !timer.sessionReadyToLog &&
    !timer.lastSession &&
    timer.mode === "idle" &&
    plannedMinutes !== null;

  const displayLabel = showPlannedTime
    ? formatPlannedTime(plannedMinutes)
    : timer.displayTime;

  const { theme, colorMode } = useTheme();
  const isLight = colorMode === "light";
  const isWife = theme === "wife";

  const canAdjustDial =
    uiMode === "timer" &&
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

    const sessionId = timer.lastSession.id;
    const playNotify = shouldPlayFocusAutoCompleteNotify(sessionId);

    if (playNotify) {
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

      // Windows notification: use Tauri's native notification plugin (reliable in built app).
      (async () => {
        try {
          const {
            isPermissionGranted,
            requestPermission,
            sendNotification,
          } = await import("@tauri-apps/plugin-notification");

          let granted = await isPermissionGranted();
          if (!granted) {
            const perm = await requestPermission();
            granted = perm === "granted";
          }

          if (granted) {
            sendNotification({
              title: "IronFocus",
              body: "Your focus block is complete.",
            });
            return;
          }
        } catch {
          // Fall back to browser notifications if plugin isn't available (e.g. web-only).
        }

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
      })();
    }

    setShowCompletionPopup(true);
  }, [timer.sessionReadyToLog, timer.lastSession]);

  // If the user selected a category before starting, carry it into the log form automatically.
  useEffect(() => {
    if (!timer.sessionReadyToLog || !timer.lastSession) return;
    if (logCategoryId) return;
    if (timer.lastSession.categoryId) {
      setLogCategoryId(timer.lastSession.categoryId);
    }
  }, [timer.sessionReadyToLog, timer.lastSession, logCategoryId]);

  // When there is no session ready to log anymore, hide the completion popup.
  useEffect(() => {
    if (!timer.sessionReadyToLog) {
      setShowCompletionPopup(false);
    }
  }, [timer.sessionReadyToLog]);

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

  useEffect(() => {
    if (!focusMode) setShowDiscardSessionModal(false);
  }, [focusMode]);

  useEffect(() => {
    if (!showDiscardSessionModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDiscardSessionModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDiscardSessionModal]);

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

  const hasActiveSession = timer.isRunning || timer.sessionReadyToLog;
  const isSessionDone =
    timer.sessionReadyToLog &&
    timer.lastSession?.mode === "focus" &&
    typeof timer.targetSeconds === "number" &&
    timer.targetSeconds > 0 &&
    timer.lastSession.durationSeconds === timer.targetSeconds;

  function handlePrimaryTimerAction() {
    if (isSessionDone) return;
    if (timer.isRunning) {
      playSingleBeep();
      timer.stop();
      return;
    }
    if (uiMode === "timer" && plannedMinutes && plannedMinutes > 0) {
      timer.startPreset(plannedMinutes, plannedCategoryId || undefined);
    } else {
      timer.startStopwatch(plannedCategoryId || undefined);
    }
  }

  /** Shared toolbar: segmented Timer | Stopwatch */
  const segmentTrackClass =
    "inline-flex rounded-xl border border-neutral-700/90 bg-neutral-950/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
  const segmentBtnBase =
    "min-h-[40px] min-w-[108px] rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200";
  const segmentActiveWife =
    "bg-pink-500 text-white shadow-md shadow-pink-950/40 ring-1 ring-pink-400/30";
  const segmentActiveClassic =
    "bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/30 ring-1 ring-amber-400/40";
  const segmentInactive =
    "text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-200";
  const segmentLocked = "cursor-not-allowed text-neutral-600 opacity-50 hover:bg-transparent hover:text-neutral-600";

  /** Compact toolbar on dashboard card only (full-screen focus mode keeps larger controls). */
  const segmentTrackClassDashboard =
    "inline-flex rounded-lg border border-neutral-700/90 bg-neutral-950/80 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
  const segmentBtnBaseDashboard =
    "min-h-[32px] min-w-[88px] rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all duration-200";

  const focusModeEnterClass = isWife
    ? "border-pink-500/35 bg-gradient-to-br from-pink-500/25 via-pink-600/10 to-neutral-950 text-pink-50 shadow-lg shadow-pink-950/25 ring-1 ring-pink-400/25 hover:border-pink-400/50 hover:from-pink-500/35 hover:shadow-pink-900/35"
    : "border-amber-500/35 bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-neutral-950 text-amber-50 shadow-lg shadow-black/30 ring-1 ring-amber-400/20 hover:border-amber-400/45 hover:from-amber-500/30 hover:shadow-amber-950/20";

  const focusModeExitClass =
    "border-neutral-600 bg-neutral-900/90 text-neutral-100 shadow-md shadow-black/25 ring-1 ring-white/5 hover:border-neutral-500 hover:bg-neutral-800 hover:text-white";

  if (focusMode) {
    const readyToConvert = timer.sessionReadyToLog;

    const statusLabel =
      uiMode === "timer" ? "MIN REMAINING" : "MIN ELAPSED";

    const displayParts = displayLabel.split(":");
    const hasHms = displayParts.length === 3;

    return (
      <>
      <section className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-50">
        <header className="shrink-0 border-b border-neutral-800/80 bg-neutral-950/90 px-4 py-3 backdrop-blur-md sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-neutral-900/90 ${
                  isWife
                    ? "border-pink-500/35 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.12)]"
                    : "border-amber-500/35 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]"
                }`}
                aria-hidden
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isWife ? "bg-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.65)]" : "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]"
                  }`}
                />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                  IronFocus
                </p>
                <p className="truncate text-sm font-semibold tracking-tight text-neutral-100">
                  Focus mode
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Minimal view · full screen
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className={segmentTrackClass}>
                <button
                  type="button"
                  onClick={() => {
                    if (uiMode !== "timer" && (timer.isRunning || timer.sessionReadyToLog)) return;
                    setUiMode("timer");
                  }}
                  className={`${segmentBtnBase} ${
                    uiMode === "timer"
                      ? isWife
                        ? segmentActiveWife
                        : segmentActiveClassic
                      : timer.isRunning || timer.sessionReadyToLog
                        ? segmentLocked
                        : segmentInactive
                  }`}
                >
                  Timer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (uiMode !== "stopwatch" && (timer.isRunning || timer.sessionReadyToLog)) return;
                    setUiMode("stopwatch");
                  }}
                  className={`${segmentBtnBase} ${
                    uiMode === "stopwatch"
                      ? isWife
                        ? segmentActiveWife
                        : segmentActiveClassic
                      : timer.isRunning || timer.sessionReadyToLog
                        ? segmentLocked
                        : segmentInactive
                  }`}
                >
                  Stopwatch
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleFocusMode()}
                className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${focusModeExitClass}`}
                aria-label="Exit focus mode and return to dashboard"
              >
                <span className="opacity-70" aria-hidden>
                  ←
                </span>
                Dashboard
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto px-6 pb-10 text-center">
          {isSessionDone ? (
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
              <div className="mb-6 shrink-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Session complete
                </div>
                <div className="mt-2 text-4xl font-semibold tabular-nums leading-none tracking-tight sm:text-5xl">
                  {hasHms ? (
                    <>
                      <span className="font-extrabold font-mono">{displayParts[0]}</span>
                      :
                      <span className="font-extrabold font-mono">{displayParts[1]}</span>
                      :
                      <span className="font-extrabold font-mono">{displayParts[2]}</span>
                    </>
                  ) : (
                    displayLabel
                  )}
                </div>
                <div className="mt-2 text-sm text-neutral-400">
                  Duration: {formatMinutesHuman(lastSessionMinutes)}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 text-left text-xs text-neutral-200 shadow-lg shadow-black/30">
                <div className="mb-3 text-[11px] font-medium text-neutral-300">
                  Save this session as a log
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-neutral-400">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={logTitle}
                      onChange={(e) => setLogTitle(e.target.value)}
                      placeholder="Focus session"
                      className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                        isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-medium text-neutral-400">
                      Category
                    </label>
                    <select
                      value={logCategoryId}
                      onChange={(e) => setLogCategoryId(e.target.value)}
                      className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none ${
                        isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <label className="block text-[11px] font-medium text-neutral-400">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Notes"
                    className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                      isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                    }`}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleConvertToLog}
                    disabled={!canConvert}
                    className={`inline-flex flex-1 items-center justify-center rounded-md border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${
                      isWife
                        ? "border-pink-500/60 bg-pink-600/80 text-neutral-50 hover:bg-pink-500"
                        : "border-amber-500/60 bg-amber-600/80 text-neutral-950 hover:bg-amber-500"
                    }`}
                  >
                    Save log
                  </button>
                </div>
                {error ? (
                  <p className="mt-2 text-[11px] text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowDiscardSessionModal(true)}
                  className="mt-4 w-full text-center text-[11px] text-neutral-500 underline decoration-neutral-600 underline-offset-2 hover:text-neutral-400"
                >
                  Discard session without saving
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="text-[62px] leading-[1] font-semibold tabular-nums tracking-tight sm:text-[92px] lg:text-[104px]">
                  {hasHms ? (
                    <>
                      <span className="font-extrabold font-mono">{displayParts[0]}</span>
                      :<span className="font-extrabold font-mono">{displayParts[1]}</span>
                      :<span className="font-extrabold font-mono">{displayParts[2]}</span>
                    </>
                  ) : (
                    displayLabel
                  )}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                  {statusLabel}
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrimaryTimerAction}
                    disabled={isSessionDone}
                    className={`inline-flex min-w-[152px] items-center justify-center rounded-xl border px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] shadow-lg transition disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900/70 disabled:text-neutral-500 ${
                      timer.isRunning
                        ? isWife
                          ? "border-pink-500/60 bg-pink-500 text-white shadow-md shadow-pink-950/30 ring-1 ring-pink-400/30 hover:bg-pink-400"
                          : "border-amber-500/60 bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/30 ring-1 ring-amber-400/40 hover:bg-amber-400"
                        : "border-neutral-500/80 bg-neutral-50 text-neutral-950 shadow-lg shadow-black/25 ring-1 ring-white/20 hover:bg-white"
                    }`}
                  >
                    {timer.isRunning || isSessionDone ? "Stop" : "Start"}
                  </button>

                  <button
                    type="button"
                    title="Clear timer and return to idle"
                    onClick={() => timer.reset()}
                    className="inline-flex min-w-[152px] items-center justify-center rounded-xl border border-neutral-700/90 bg-neutral-900/80 px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400 shadow-md shadow-black/20 ring-1 ring-white/5 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-neutral-200"
                  >
                    Reset
                  </button>
                </div>

                {readyToConvert && (
                  <div className="mt-6 w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 text-left text-xs text-neutral-200 shadow-lg shadow-black/30">
                    <div className="mb-3 text-[11px] font-medium text-neutral-300">
                      Save paused session as a log
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-medium text-neutral-400">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={logTitle}
                          onChange={(e) => setLogTitle(e.target.value)}
                          placeholder="Focus session"
                          className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                            isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                          }`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-medium text-neutral-400">
                          Category
                        </label>
                        <select
                          value={logCategoryId}
                          onChange={(e) => setLogCategoryId(e.target.value)}
                          className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none ${
                            isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                          }`}
                        >
                          <option value="">Select category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <label className="block text-[11px] font-medium text-neutral-400">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="Notes"
                        className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                          isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                        }`}
                      />
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={handleConvertToLog}
                        disabled={!canConvert}
                        className={`inline-flex flex-1 items-center justify-center rounded-md border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${
                          isWife
                            ? "border-pink-500/60 bg-pink-600/80 text-neutral-50 hover:bg-pink-500"
                            : "border-amber-500/60 bg-amber-600/80 text-neutral-950 hover:bg-amber-500"
                        }`}
                      >
                        Save log
                      </button>
                    </div>
                    {error ? (
                      <p className="mt-2 text-[11px] text-red-400" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowDiscardSessionModal(true)}
                      className="mt-4 w-full text-center text-[11px] text-neutral-500 underline decoration-neutral-600 underline-offset-2 hover:text-neutral-400"
                    >
                      Discard session without saving
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </section>

      {showDiscardSessionModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setShowDiscardSessionModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-session-title"
            className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950/95 p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="discard-session-title"
              className="text-sm font-semibold tracking-wide text-neutral-100"
            >
              Discard this session?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              This session will not be saved as a log. You can&apos;t undo this
              action.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:bg-neutral-800"
                onClick={() => setShowDiscardSessionModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-red-500/60 bg-red-600/90 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-50 shadow-sm transition-colors hover:bg-red-500"
                onClick={() => {
                  timer.reset();
                  setShowDiscardSessionModal(false);
                }}
              >
                Discard session
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const statusText = timer.isRunning
    ? uiMode === "timer"
      ? "Focusing"
      : "Tracking time"
    : timer.sessionReadyToLog
      ? "Session ready to save"
      : "Ready to focus";

  return (
    <section className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] transition-opacity duration-700 ${
          timer.isRunning
            ? isWife
              ? "bg-pink-500/20 opacity-100"
              : "bg-amber-500/15 opacity-100"
            : isWife
              ? "bg-pink-500/10 opacity-70"
              : "bg-amber-500/10 opacity-70"
        }`}
      />

      <header className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
            IronFocus
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-100">
            {greeting}.
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <div className={segmentTrackClassDashboard}>
            <button
              type="button"
              onClick={() => {
                if (uiMode !== "timer" && hasActiveSession) return;
                setUiMode("timer");
              }}
              className={`${segmentBtnBaseDashboard} ${
                uiMode === "timer"
                  ? isWife
                    ? segmentActiveWife
                    : segmentActiveClassic
                  : hasActiveSession
                    ? segmentLocked
                    : segmentInactive
              }`}
            >
              Timer
            </button>
            <button
              type="button"
              onClick={() => {
                if (uiMode !== "stopwatch" && hasActiveSession) return;
                setUiMode("stopwatch");
              }}
              className={`${segmentBtnBaseDashboard} ${
                uiMode === "stopwatch"
                  ? isWife
                    ? segmentActiveWife
                    : segmentActiveClassic
                  : hasActiveSession
                    ? segmentLocked
                    : segmentInactive
              }`}
            >
              Stopwatch
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleFocusMode();
              setShowCompletionPopup(false);
            }}
            className={`inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${focusModeEnterClass}`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                isWife
                  ? "border-pink-400/30 bg-pink-500/20 text-pink-100"
                  : "border-amber-400/30 bg-amber-500/20 text-amber-100"
              }`}
              aria-hidden
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </span>
            Focus mode
          </button>
        </div>
      </header>

      {showCompletionPopup && (
        <div className="relative z-10 mx-auto mb-3 w-full max-w-xl rounded-lg border border-neutral-700 bg-neutral-950/95 px-4 py-3 text-xs text-neutral-100 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  isWife ? "bg-pink-600/60 text-pink-100" : "bg-amber-500/70 text-neutral-950"
                }`}
              >
                ✓
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Focus block complete
                </div>
                <div className="text-[11px] text-neutral-300">
                  Your timer has finished. You can convert it into a log below.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCompletionPopup(false)}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300 hover:bg-neutral-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-7 py-4">
        <div className="flex w-full flex-col items-center gap-6">
          <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                Category (optional)
              </label>
              <select
                value={plannedCategoryId}
                onChange={(e) => setPlannedCategoryId(e.target.value)}
                disabled={hasActiveSession}
                className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none ${
                  hasActiveSession ? "cursor-not-allowed opacity-60" : ""
                } ${
                  isWife ? "focus:border-pink-500/70" : "focus:border-amber-500/70"
                }`}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
              ))}
            </select>
          </div>
          <div className="relative flex h-52 w-52 items-center justify-center md:h-60 md:w-60">
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
              className={`relative flex h-full w-full items-center justify-center rounded-full ${
                canAdjustDial
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-default opacity-80"
              }`}
            >
              {(() => {
                // Drive the arc from live time when running.
                let dialAngleDeg = baseAngleDeg;
                let centerMinutes = customMinutes;
                let bottomLabel = "MIN";

                if (
                  uiMode === "timer" &&
                  timer.mode === "focus" &&
                  typeof timer.targetSeconds === "number" &&
                  timer.targetSeconds > 0
                ) {
                  const total = timer.targetSeconds;
                  const remaining = Math.max(0, total - timer.elapsedSeconds);
                  const wholeMinutes = Math.round(remaining / 60);
                  const clampedMinutes = Math.max(0, Math.min(180, wholeMinutes));
                  dialAngleDeg = (clampedMinutes / 180) * 360;
                  centerMinutes = clampedMinutes;
                  bottomLabel = "REMAINING";
                } else if (uiMode === "stopwatch") {
                  const elapsedMinutes = Math.round(
                    Math.max(0, timer.elapsedSeconds) / 60,
                  );
                  const clampedMinutes = Math.max(0, Math.min(180, elapsedMinutes));
                  dialAngleDeg = (clampedMinutes / 180) * 360;
                  centerMinutes = clampedMinutes;
                  bottomLabel = "ELAPSED";
                }

                // SVG ring constants (viewBox 0 0 160 160, center 80 80)
                const R = 68;
                const circumference = 2 * Math.PI * R;
                const progress = Math.min(1, dialAngleDeg / 360);
                const dashOffset = circumference * (1 - progress);
                const accentColor = isWife ? "#ec4899" : "#f59e0b";
                const trackColor  = isLight
                  ? "rgba(100,110,130,0.22)"
                  : "rgba(255,255,255,0.07)";
                const faceColor   = isLight ? "#e2e4ea" : "#08090f";

                return (
                  <>
                    <svg
                      className="absolute inset-0 h-full w-full"
                      viewBox="0 0 160 160"
                      fill="none"
                      aria-hidden
                    >
                      {/* Dial face */}
                      <circle cx="80" cy="80" r="76" fill={faceColor} />

                      {/* Subtle outer rim */}
                      <circle
                        cx="80" cy="80" r="76"
                        stroke={isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.04)"}
                        strokeWidth="1"
                      />

                      {/* Track ring */}
                      <circle
                        cx="80" cy="80" r={R}
                        stroke={trackColor}
                        strokeWidth="11"
                      />

                      {/* Progress arc — flat butt cap for clean industrial precision */}
                      {progress > 0.005 && (
                        <circle
                          cx="80" cy="80" r={R}
                          stroke={accentColor}
                          strokeWidth="11"
                          strokeLinecap="butt"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          transform="rotate(-90 80 80)"
                          style={{
                            transition: timer.isRunning
                              ? "stroke-dashoffset 0.9s linear"
                              : undefined,
                          }}
                        />
                      )}
                    </svg>

                    {/* Center text */}
                    <div className="relative z-10 flex select-none flex-col items-center justify-center">
                      <span
                        className={`text-[32px] font-extrabold tabular-nums leading-none tracking-tight md:text-[38px] ${
                          isWife ? "text-pink-100" : "text-amber-100"
                        }`}
                      >
                        {centerMinutes.toString().padStart(2, "0")}
                      </span>
                      <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        {bottomLabel}
                      </span>
                    </div>
                  </>
                );
              })()}
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-semibold tabular-nums tracking-tight text-neutral-50 md:text-7xl">
              {displayLabel}
            </div>
            <div
              className={`text-[11px] font-medium uppercase tracking-[0.25em] ${
                timer.isRunning
                  ? isWife
                    ? "text-pink-300/90"
                    : "text-amber-300/90"
                  : "text-neutral-500"
              }`}
            >
              {statusText}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handlePrimaryTimerAction}
              disabled={isSessionDone}
              className={`inline-flex min-w-[150px] items-center justify-center rounded-full border px-8 py-3 text-xs font-bold uppercase tracking-[0.18em] shadow-lg transition disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900/70 disabled:text-neutral-500 ${
                timer.isRunning
                  ? isWife
                    ? "border-pink-500/60 bg-pink-500 text-white shadow-md shadow-pink-950/30 ring-1 ring-pink-400/30 hover:bg-pink-400"
                    : "border-amber-500/60 bg-amber-500 text-neutral-950 shadow-md shadow-amber-950/30 ring-1 ring-amber-400/40 hover:bg-amber-400"
                  : "border-neutral-500/70 bg-neutral-50/95 text-neutral-950 ring-1 ring-white/10 hover:bg-white"
              }`}
            >
              {timer.isRunning || isSessionDone ? "Stop" : "Start"}
            </button>
            <button
              type="button"
              onClick={() => timer.reset()}
              className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-neutral-700/90 bg-neutral-900/90 px-7 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 shadow-md ring-1 ring-white/5 hover:border-neutral-600 hover:bg-neutral-800 hover:text-neutral-200"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-600">
            Quick presets
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (uiMode === "stopwatch" || hasActiveSession) return;
                  setPlannedMinutes(m);
                  setCustomMinutes(m);
                }}
                disabled={uiMode === "stopwatch" || hasActiveSession}
                className={`min-w-[76px] rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.16em] shadow-sm ${
                  uiMode === "stopwatch" || hasActiveSession
                    ? "cursor-not-allowed border-neutral-800 bg-neutral-900 text-neutral-600 opacity-60"
                    : plannedMinutes === m
                      ? isWife
                        ? "border-pink-500 bg-pink-500/15 text-pink-300"
                        : "border-amber-500 bg-amber-500/15 text-amber-300"
                      : isWife
                        ? "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-pink-500 hover:text-pink-300"
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
        <div className="relative z-10 mx-auto mt-4 w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-xs text-neutral-200 shadow-lg shadow-black/30">
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
                className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                  isWife
                    ? "focus:border-pink-500/70"
                    : "focus:border-amber-500/70"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-neutral-400">
                Category
              </label>
              <select
                value={logCategoryId}
                onChange={(e) => setLogCategoryId(e.target.value)}
                className={`w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none ${
                  isWife
                    ? "focus:border-pink-500/70"
                    : "focus:border-amber-500/70"
                }`}
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
              className={`flex-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none placeholder:text-neutral-600 ${
                isWife
                  ? "focus:border-pink-500/70"
                  : "focus:border-amber-500/70"
              }`}
            />
            <button
              type="button"
              onClick={handleConvertToLog}
              disabled={!canConvert}
              className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${
                isWife
                  ? "border-pink-500/60 bg-pink-600/80 text-neutral-50 hover:bg-pink-500"
                  : "border-amber-500/60 bg-amber-600/80 text-neutral-950 hover:bg-amber-500"
              }`}
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

