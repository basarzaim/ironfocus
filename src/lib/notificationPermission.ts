export type NotificationPermissionState = "granted" | "denied" | "unknown";

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const { isPermissionGranted } = await import(
      "@tauri-apps/plugin-notification"
    );
    const granted = await isPermissionGranted();
    return granted ? "granted" : "denied";
  } catch {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unknown";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return "unknown";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      const result = await requestPermission();
      granted = result === "granted";
    }
    return granted ? "granted" : "denied";
  } catch {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unknown";
    }
    const result = await Notification.requestPermission();
    if (result === "granted") return "granted";
    if (result === "denied") return "denied";
    return "unknown";
  }
}
