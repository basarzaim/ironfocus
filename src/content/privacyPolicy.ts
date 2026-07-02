export type PrivacySection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY = {
  title: "IronFocus Privacy Policy",
  lastUpdated: "June 30, 2026",
  label: "IronFocus Store Beta",
  intro:
    "IronFocus is a local focus timer and work log application. This policy describes how the app handles information during the beta period, before cloud sync and accounts are available.",
  sections: [
    {
      heading: "Data we collect",
      paragraphs: [
        "IronFocus does not collect, transmit, or sell personal data to our servers. Focus sessions, logs, categories, and preferences are stored on your device only.",
      ],
    },
    {
      heading: "Data stored on your device",
      paragraphs: [
        "You can export this data as JSON from Settings → Data. Uninstalling the app may remove local data depending on your system.",
      ],
      bullets: [
        "Focus logs (title, category, times, notes, tags)",
        "Custom categories and colors",
        "App preferences (theme, notifications, retention settings)",
      ],
    },
    {
      heading: "Notifications",
      paragraphs: [
        "If enabled, IronFocus may show local desktop notifications when a focus block completes. Notification permission is controlled by Windows and can be revoked in system settings.",
      ],
    },
    {
      heading: "Future cloud sync",
      paragraphs: [
        "A future version may offer optional account-based cloud sync. If added, this policy will be updated before collection begins, and sync will be opt-in.",
      ],
    },
    {
      heading: "Children",
      paragraphs: ["IronFocus is not directed at children under 13."],
    },
    {
      heading: "Contact",
      paragraphs: [
        "For privacy questions during beta, use the in-app diagnostic info copy feature in Settings until a public support channel is published.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update this policy as the product moves toward general availability. Material changes will be reflected in the app and store listing.",
      ],
    },
  ] satisfies PrivacySection[],
} as const;
