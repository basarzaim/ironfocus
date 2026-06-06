/**
 * Prevents duplicate desktop/audio completion cues when TimerPanel remounts
 * (e.g. exiting Focus Mode) while the same completed session is still ready to log.
 */
const notifiedAutoCompleteSessionIds = new Set<string>();

/** Returns true the first time we should play notify for this session id; false on repeats. */
export function shouldPlayFocusAutoCompleteNotify(sessionId: string): boolean {
  if (notifiedAutoCompleteSessionIds.has(sessionId)) return false;
  notifiedAutoCompleteSessionIds.add(sessionId);
  return true;
}

/** Call when the session is cleared so future sessions can notify normally. */
export function forgetFocusAutoCompleteNotify(sessionId: string) {
  notifiedAutoCompleteSessionIds.delete(sessionId);
}
