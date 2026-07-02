export const STORAGE_KEYS = {
  categories: "ironfocus.categories.v1",
  logs: "ironfocus.logs.v1",
  categoriesBackup: "ironfocus.categories.v1.bak",
  logsBackup: "ironfocus.logs.v1.bak",
  theme: "ironfocus.theme",
  colorMode: "ironfocus.colorMode",
  sidebarCollapsed: "ironfocus.sidebar.collapsed",
  onboardingCompleted: "ironfocus.onboarding.v1.completed",
  userPreferences: "ironfocus.preferences.v1",
  timerPlannedMinutes: "ironfocus-timer-planned-minutes",
  coreVariantPreview: "ironfocus-core-variant-preview",
  coreGrowthPreview: "ironfocus-core-growth-preview",
  persistenceManifest: "ironfocus.persistence.manifest",
  lastError: "ironfocus.lastError.v1",
} as const;

/** Legacy theme value before rose rename. */
export const LEGACY_THEME_WIFE = "wife";
