const FALLBACK_HEX: Record<string, string> = {
  "if-accent": "#f59e0b",
  "if-accent-strong": "#d97706",
  "if-accent-muted": "#fbbf24",
};

/** Resolves a live `--if-accent*` CSS custom property to its computed color string. */
export function getCssAccentColor(
  token: "if-accent" | "if-accent-strong" | "if-accent-muted" = "if-accent",
): string {
  if (typeof window === "undefined") return FALLBACK_HEX[token];
  const root = window.document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(`--${token}`).trim();
  return value || FALLBACK_HEX[token];
}
