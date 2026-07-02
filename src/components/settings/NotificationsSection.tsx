import { useEffect, useState } from "react";
import { usePreferences } from "../../state/PreferencesProvider";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from "../../lib/notificationPermission";
import { ACCENT_CALLOUT, ACCENT_CALLOUT_BTN } from "../../lib/accentStyles";

export function NotificationsSection() {
  const {
    preferences,
    setNotificationsEnabled,
    setCompletionSoundEnabled,
  } = usePreferences();
  const [permission, setPermission] =
    useState<"granted" | "denied" | "unknown">("unknown");

  useEffect(() => {
    void getNotificationPermissionState().then(setPermission);
  }, []);

  async function handleEnableNotifications() {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === "granted") {
      setNotificationsEnabled(true);
    }
  }

  return (
    <div className="space-y-3 text-[11px] text-neutral-500">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={preferences.notificationsEnabled}
          onChange={(e) => setNotificationsEnabled(e.target.checked)}
          className="rounded border-neutral-700 bg-neutral-900"
        />
        <span className="text-neutral-300">
          Desktop notifications on focus complete
        </span>
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

      {permission === "denied" && preferences.notificationsEnabled ? (
        <div className={`${ACCENT_CALLOUT} p-3`}>
          Notifications are blocked by Windows. Enable IronFocus in Settings →
          System → Notifications, or use the button below to request permission
          again.
          <button
            type="button"
            onClick={() => void handleEnableNotifications()}
            className={`mt-2 block ${ACCENT_CALLOUT_BTN}`}
          >
            Request permission
          </button>
        </div>
      ) : (
        <p className="leading-relaxed">
          If notifications are blocked, enable IronFocus in Windows Settings →
          System → Notifications.
        </p>
      )}
    </div>
  );
}
