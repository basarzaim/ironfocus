import { STORAGE_KEYS } from "./storageKeys";

export function isOnboardingCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.localStorage.getItem(STORAGE_KEYS.onboardingCompleted) === "1"
  );
}

export function markOnboardingCompleted(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.onboardingCompleted, "1");
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.onboardingCompleted);
}
