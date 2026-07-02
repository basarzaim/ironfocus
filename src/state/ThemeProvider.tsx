import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getPersistedValue,
  setPersistedValue,
} from "../lib/persistence/persistenceClient";
import { LEGACY_THEME_WIFE, STORAGE_KEYS } from "../lib/storageKeys";

export type AccentId =
  | "classic"
  | "pink"
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "turquoise";

export const ACCENT_IDS: AccentId[] = [
  "classic",
  "pink",
  "blue",
  "purple",
  "green",
  "red",
  "turquoise",
];

type ColorMode = "dark" | "light";

type ThemeContextValue = {
  accentId: AccentId;
  colorMode: ColorMode;
  setAccentId: (accentId: AccentId) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/** Pure migration rule: legacy rose/wife values move to pink; unknown/missing falls back to classic. */
export function resolveAccentId(raw: string | null | undefined): AccentId {
  if ((ACCENT_IDS as string[]).includes(raw ?? "")) return raw as AccentId;
  if (raw === "rose" || raw === LEGACY_THEME_WIFE) return "pink";
  return "classic";
}

function readStoredAccent(): AccentId {
  try {
    return resolveAccentId(getPersistedValue(STORAGE_KEYS.theme));
  } catch {
    return "classic";
  }
}

function readStoredColorMode(): ColorMode {
  try {
    const raw = getPersistedValue(STORAGE_KEYS.colorMode);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    // ignore
  }
  return "dark";
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [accentId, setAccentIdState] = useState<AccentId>(readStoredAccent);
  const [colorMode, setColorModeState] = useState<ColorMode>(readStoredColorMode);

  useEffect(() => {
    try {
      setPersistedValue(STORAGE_KEYS.theme, accentId);
      const root = window.document.documentElement;
      root.classList.remove("theme-classic", "theme-rose", "theme-wife");
      root.setAttribute("data-accent", accentId);
    } catch {
      // ignore
    }
  }, [accentId]);

  useEffect(() => {
    try {
      setPersistedValue(STORAGE_KEYS.colorMode, colorMode);
      const root = window.document.documentElement;
      root.classList.remove("mode-dark", "mode-light");
      root.classList.add(colorMode === "light" ? "mode-light" : "mode-dark");
    } catch {
      // ignore
    }
  }, [colorMode]);

  const setAccentId = (next: AccentId) => {
    setAccentIdState(next);
  };

  const setColorMode = (next: ColorMode) => {
    setColorModeState(next);
  };

  const toggleColorMode = () => {
    setColorModeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider
      value={{
        accentId,
        colorMode,
        setAccentId,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useAccent(): { accentId: AccentId; isClassic: boolean } {
  const { accentId } = useTheme();
  return { accentId, isClassic: accentId === "classic" };
}
