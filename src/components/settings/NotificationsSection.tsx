import { usePreferences } from "../../state/PreferencesProvider";

export function NotificationsSection() {
  const {
    preferences,
    setNotificationsEnabled,
    setCompletionSoundEnabled,
  } = usePreferences();

  return (
    <div className="space-y-3 text-[11px] text-neutral-500">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={preferences.notificationsEnabled}
          onChange={(e) => setNotificationsEnabled(e.target.checked)}
          className="rounded border-neutral-700 bg-neutral-900"
        />
        <span className="text-neutral-300">Desktop notifications on focus complete</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={preferences.completionSoundEnabled}
          onChange={(e) => setCompletionSoundEnabled(e.target.checked)}
          className="rounded border-neutral-700 bg-neutral-900"
        />
        <span className="text-neutral-300">Completion sound</span>
      </label>
      <p className="leading-relaxed">
        If notifications are blocked, enable IronFocus in Windows Settings →
        System → Notifications.
      </p>
    </div>
  );
}
