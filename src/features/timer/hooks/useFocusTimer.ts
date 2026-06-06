import { useEffect, useMemo, useRef, useState } from "react";
import { forgetFocusAutoCompleteNotify } from "../../../lib/focusCompletionNotificationDedup";
import type { TimerMode, TimerSession } from "../../../types/models";

export function useFocusTimer() {
  const [mode, setMode] = useState<TimerMode>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null);
  const [lastSession, setLastSession] = useState<TimerSession | null>(null);
  const [sessionReadyToLog, setSessionReadyToLog] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const activeSessionRef = useRef<TimerSession | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (mode === "focus" && targetSeconds !== null && next >= targetSeconds) {
          setIsRunning(false);
          const stoppedAt = new Date().toISOString();
          const base = activeSessionRef.current;
          setLastSession(
            base ? { ...base, stoppedAt, durationSeconds: targetSeconds } : null,
          );
          setActiveSession(null);
          setSessionReadyToLog(true);
          return targetSeconds;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, mode, targetSeconds]);

  function startStopwatch(categoryId?: string) {
    setMode("stopwatch");
    setTargetSeconds(null);
    setSessionReadyToLog(false);

    setLastSession(null);

    setActiveSession((prev) => {
      if (prev && prev.mode === "stopwatch") {
        if (prev.stoppedAt) {
          return { ...prev, stoppedAt: undefined };
        }
        return prev;
      }

      const startedAt = new Date().toISOString();
      setElapsedSeconds(0);
      return {
        id: `ts-${Date.now()}`,
        mode: "stopwatch",
        categoryId,
        startedAt,
        durationSeconds: 0,
      };
    });

    setIsRunning(true);
  }

  function startPreset(minutes: number, categoryId?: string) {
    const seconds = minutes * 60;
    setMode("focus");
    setSessionReadyToLog(false);
    setLastSession(null);

    // If we have a paused focus session with the same target, resume instead of restarting.
    if (
      !isRunning &&
      activeSessionRef.current &&
      activeSessionRef.current.mode === "focus" &&
      activeSessionRef.current.presetMinutes === minutes &&
      targetSeconds === seconds
    ) {
      setActiveSession((prev) =>
        prev ? { ...prev, stoppedAt: undefined } : prev,
      );
      setIsRunning(true);
      return;
    }

    // Otherwise start a fresh focus block.
    setElapsedSeconds(0);
    setTargetSeconds(seconds);
    const startedAt = new Date().toISOString();
    setActiveSession({
      id: `ts-${Date.now()}`,
      mode: "focus",
      presetMinutes: minutes,
      categoryId,
      startedAt,
      durationSeconds: 0,
    });
    setIsRunning(true);
  }

  function stop() {
    const stoppedAt = new Date().toISOString();
    const base = activeSessionRef.current;

    // If nothing is running or active, but we already have a last session,
    // just ensure the log panel is visible.
    if (!isRunning && !base) {
      if (lastSession) {
        setSessionReadyToLog(true);
      }
      return;
    }

    // Stop ticking if currently running.
    if (isRunning) {
      setIsRunning(false);

      // For focus mode, treat Stop as a pause at the current time.
      if (mode === "focus" && targetSeconds !== null && elapsedSeconds < targetSeconds) {
        setActiveSession((prev) =>
          prev ? { ...prev, stoppedAt, durationSeconds: elapsedSeconds } : prev,
        );
        setLastSession(
          base ? { ...base, stoppedAt, durationSeconds: elapsedSeconds } : null,
        );
        setSessionReadyToLog(elapsedSeconds > 0);
        return;
      }
    }

    // For stopwatch or completed focus, Stop ends the session and makes it ready to log.
    setLastSession(
      base ? { ...base, stoppedAt, durationSeconds: elapsedSeconds } : null,
    );
    setActiveSession((prev) =>
      prev ? { ...prev, stoppedAt, durationSeconds: elapsedSeconds } : prev,
    );
    setSessionReadyToLog(elapsedSeconds > 0);
  }

  function reset() {
    if (lastSession?.id) forgetFocusAutoCompleteNotify(lastSession.id);
    setIsRunning(false);
    setMode("idle");
    setElapsedSeconds(0);
    setTargetSeconds(null);
    setSessionReadyToLog(false);
    setActiveSession(null);
    setLastSession(null);
  }

  function consumeSessionForLogging() {
    const session = lastSession;
    if (session?.id) forgetFocusAutoCompleteNotify(session.id);
    setSessionReadyToLog(false);
    setLastSession(null);
    setIsRunning(false);
    setMode("idle");
    setElapsedSeconds(0);
    setTargetSeconds(null);
    setActiveSession(null);
    return session;
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const two = (n: number) => n.toString().padStart(2, "0");
    return `${two(hrs)}:${two(mins)}:${two(secs)}`;
  }

  const displaySeconds =
    mode === "focus" && targetSeconds !== null
      ? Math.max(0, targetSeconds - elapsedSeconds)
      : elapsedSeconds;

  const displayTime = useMemo(() => formatTime(displaySeconds), [displaySeconds]);

  const runningLabel = useMemo(() => {
    if (mode === "focus" && targetSeconds !== null) {
      const totalMinutes = Math.round(targetSeconds / 60);
      return `Focus ${totalMinutes}m`;
    }
    if (mode === "stopwatch") return "Stopwatch";
    return "Idle";
  }, [mode, targetSeconds]);

  return {
    mode,
    isRunning,
    elapsedSeconds,
    targetSeconds,
    displayTime,
    runningLabel,
    startStopwatch,
    startPreset,
    stop,
    reset,
    sessionReadyToLog,
    lastSession,
    consumeSessionForLogging,
  };
}

