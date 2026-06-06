import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "classic" | "wife";
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

const STORAGE_KEY = "ironfocus.theme";
const MODE_STORAGE_KEY = "ironfocus.colorMode";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "wife";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "classic" || raw === "wife") return raw;
    } catch {
      // ignore
    }
    return "wife";
  });

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
      if (raw === "dark" || raw === "light") return raw;
    } catch {
      // ignore
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
      const root = window.document.documentElement;
      root.classList.remove("theme-classic", "theme-wife");
      root.classList.add(theme === "wife" ? "theme-wife" : "theme-classic");
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, colorMode);
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
    setThemeState((prev) => (prev === "classic" ? "wife" : "classic"));
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

