import type { AccentId } from "../../../state/ThemeProvider";

export type IronThemePalette = {
  /** Brightest vein highlight. */
  hot: string;
  /** Dark saturated vein base. */
  amber: string;
  /** Vivid vein-center filament color. */
  orange: string;
  /** Dark bleed color around vein edges. */
  seep: string;
  /** Brightest session-end lava flood color. */
  floodHot: string;
};

/** Classic — matches the original IRON_SCENE_TUNING.coreRamp/veinOrange/lavaFlood values. */
const CLASSIC: IronThemePalette = {
  hot: "#e8b450",
  amber: "#8a5a18",
  orange: "#f08028",
  seep: "#6b4210",
  floodHot: "#f5d050",
};

const PINK: IronThemePalette = {
  hot: "#f9a8d4",
  amber: "#831843",
  orange: "#ec4899",
  seep: "#9d174d",
  floodHot: "#fbcfe8",
};

const BLUE: IronThemePalette = {
  hot: "#93c5fd",
  amber: "#1e3a8a",
  orange: "#3b82f6",
  seep: "#1e40af",
  floodHot: "#bfdbfe",
};

const PURPLE: IronThemePalette = {
  hot: "#d8b4fe",
  amber: "#581c87",
  orange: "#a855f7",
  seep: "#6b21a8",
  floodHot: "#e9d5ff",
};

const GREEN: IronThemePalette = {
  hot: "#86efac",
  amber: "#14532d",
  orange: "#22c55e",
  seep: "#166534",
  floodHot: "#bbf7d0",
};

const RED: IronThemePalette = {
  hot: "#fca5a5",
  amber: "#7f1d1d",
  orange: "#ef4444",
  seep: "#991b1b",
  floodHot: "#fecaca",
};

const TURQUOISE: IronThemePalette = {
  hot: "#5eead4",
  amber: "#134e4a",
  orange: "#14b8a6",
  seep: "#115e59",
  floodHot: "#99f6e4",
};

export const IRON_THEME_PALETTES: Record<AccentId, IronThemePalette> = {
  classic: CLASSIC,
  pink: PINK,
  blue: BLUE,
  purple: PURPLE,
  green: GREEN,
  red: RED,
  turquoise: TURQUOISE,
};

export function getIronThemePalette(accentId: AccentId): IronThemePalette {
  return IRON_THEME_PALETTES[accentId] ?? CLASSIC;
}
