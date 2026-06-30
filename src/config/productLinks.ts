/** External links for store and in-app settings. Update when channels go live. */
export const PRODUCT_LINKS = {
  /** Set when a public privacy URL is hosted; dev/build uses relative path. */
  privacyPath: "/privacy.html",
  supportEmail: null as string | null,
  feedbackUrl: null as string | null,
  bugReportUrl: null as string | null,
} as const;

export function hasSupportChannel(): boolean {
  return Boolean(
    PRODUCT_LINKS.supportEmail ||
      PRODUCT_LINKS.feedbackUrl ||
      PRODUCT_LINKS.bugReportUrl,
  );
}
