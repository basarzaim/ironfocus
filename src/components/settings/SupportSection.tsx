import { PRODUCT_INFO } from "../../config/productInfo";
import { PRODUCT_LINKS, hasSupportChannel } from "../../config/productLinks";
import { resetOnboarding } from "../../lib/onboarding";

type SupportSectionProps = {
  onReplayOnboarding: () => void;
};

export function SupportSection({ onReplayOnboarding }: SupportSectionProps) {
  async function openPrivacy() {
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await openUrl(`${origin}${PRODUCT_LINKS.privacyPath}`);
    } catch {
      window.open(PRODUCT_LINKS.privacyPath, "_blank", "noopener,noreferrer");
    }
  }

  async function copyDiagnostics() {
    const info = [
      `App: ${PRODUCT_INFO.name} ${PRODUCT_INFO.label}`,
      `Version: ${PRODUCT_INFO.version}`,
      `Channel: ${PRODUCT_INFO.channel}`,
      `Platform: ${navigator.platform}`,
      `User agent: ${navigator.userAgent}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(info);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className="space-y-3 text-[11px] text-neutral-500">
      {!hasSupportChannel() ? (
        <p className="leading-relaxed text-neutral-500">
          A public support channel is not set up yet. Use{" "}
          <span className="text-neutral-400">Copy diagnostic info</span> if you
          need to share details with the developer.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void openPrivacy()}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:border-neutral-500"
        >
          Privacy policy
        </button>
        <button
          type="button"
          onClick={() => void copyDiagnostics()}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:border-neutral-500"
        >
          Copy diagnostic info
        </button>
        <button
          type="button"
          onClick={() => {
            resetOnboarding();
            onReplayOnboarding();
          }}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:border-neutral-500"
        >
          Replay onboarding
        </button>
      </div>
    </div>
  );
}
