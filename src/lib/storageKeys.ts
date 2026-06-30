export const STORAGE_KEYS = {
  categories: "ironfocus.categories.v1",
  logs: "ironfocus.logs.v1",
  theme: "ironfocus.theme",
  colorMode: "ironfocus.colorMode",
  sidebarCollapsed: "ironfocus.sidebar.collapsed",
  onboardingCompleted: "ironfocus.onboarding.v1.completed",
  userPreferences: "ironfocus.preferences.v1",
  timerPlannedMinutes: "ironfocus-timer-planned-minutes",
  coreVariantPreview: "ironfocus-core-variant-preview",
  coreGrowthPreview: "ironfocus-core-growth-preview",
} as const;

/** Legacy theme value before rose rename. */
export const LEGACY_THEME_WIFE = "wife";
