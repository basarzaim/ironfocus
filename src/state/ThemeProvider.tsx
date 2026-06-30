import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LEGACY_THEME_WIFE, STORAGE_KEYS } from "../lib/storageKeys";

type Theme = "classic" | "rose";
type ColorMode = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  colorMode: ColorMode;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleTheme: () => void;
  toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "classic";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (raw === "classic" || raw === "rose") return raw;
    if (raw === LEGACY_THEME_WIFE) return "rose";
  } catch {
    // ignore
  }
  return "classic";
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.colorMode);
      if (raw === "dark" || raw === "light") return raw;
    } catch {
      // ignore
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
      const root = window.document.documentElement;
      root.classList.remove("theme-classic", "theme-rose", "theme-wife");
      root.classList.add(theme === "rose" ? "theme-rose" : "theme-classic");
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.colorMode, colorMode);
      const root = window.document.documentElement;
      root.classList.remove("mode-dark", "mode-light");
      root.classList.add(colorMode === "light" ? "mode-light" : "mode-dark");
    } catch {
      // ignore
    }
  }, [colorMode]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
  };

  const setColorMode = (next: ColorMode) => {
    setColorModeState(next);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "classic" ? "rose" : "classic"));
  };

  const toggleColorMode = () => {
    setColorModeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorMode,
        setTheme,
        setColorMode,
        toggleTheme,
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

export function useRoseAccent(): boolean {
  const { theme } = useTheme();
  return theme === "rose";
}
