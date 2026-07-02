import {
  getPersistedValue,
  setPersistedValue,
  removePersistedValue,
} from "./persistence/persistenceClient";
import { STORAGE_KEYS } from "./storageKeys";

export function isOnboardingCompleted(): boolean {
  return getPersistedValue(STORAGE_KEYS.onboardingCompleted) === "1";
}

export function markOnboardingCompleted(): void {
  setPersistedValue(STORAGE_KEYS.onboardingCompleted, "1");
}

export function resetOnboarding(): void {
  removePersistedValue(STORAGE_KEYS.onboardingCompleted);
}
