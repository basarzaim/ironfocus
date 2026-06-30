import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadUserPreferences,
  saveUserPreferences,
  type RetentionPolicy,
  type UserPreferences,
} from "../lib/userPreferences";
import { useAppState } from "./AppStateProvider";

type PreferencesContextValue = {
  preferences: UserPreferences;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCompletionSoundEnabled: (enabled: boolean) => void;
  setRetentionPolicy: (policy: RetentionPolicy) => void;
  applyRetentionNow: () => number;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

type PreferencesProviderProps = {
  children: ReactNode;
};

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const { pruneLogsByRetentionPolicy } = useAppState();
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadUserPreferences(),
  );

  const persist = useCallback((next: UserPreferences) => {
    setPreferences(next);
    saveUserPreferences(next);
  }, []);

  const setNotificationsEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...preferences, notificationsEnabled: enabled });
    },
    [persist, preferences],
  );

  const setCompletionSoundEnabled = useCallback(
    (enabled: boolean) => {
      persist({ ...preferences, completionSoundEnabled: enabled });
    },
    [persist, preferences],
  );

  const setRetentionPolicy = useCallback(
    (policy: RetentionPolicy) => {
      persist({
        ...preferences,
        retentionPolicy: policy,
        lastRetentionRunAt: null,
      });
    },
    [persist, preferences],
  );

  const applyRetentionNow = useCallback(() => {
    return pruneLogsByRetentionPolicy();
  }, [pruneLogsByRetentionPolicy]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      setNotificationsEnabled,
      setCompletionSoundEnabled,
      setRetentionPolicy,
      applyRetentionNow,
    }),
    [
      preferences,
      setNotificationsEnabled,
      setCompletionSoundEnabled,
      setRetentionPolicy,
      applyRetentionNow,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
