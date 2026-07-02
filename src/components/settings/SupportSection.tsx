import { useState } from "react";
import { PRODUCT_INFO } from "../../config/productInfo";
import { formatDiagnosticsBundle } from "../../lib/errorReporting";
import { hasSupportChannel } from "../../config/productLinks";
import { resetOnboarding } from "../../lib/onboarding";
import { PrivacyPolicyModal } from "../legal/PrivacyPolicyModal";

type SupportSectionProps = {
  onReplayOnboarding: () => void;
};

export function SupportSection({ onReplayOnboarding }: SupportSectionProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  async function copyDiagnostics() {
    const info = [
      `App: ${PRODUCT_INFO.name} ${PRODUCT_INFO.label}`,
      `Version: ${PRODUCT_INFO.version}`,
      `Channel: ${PRODUCT_INFO.channel}`,
      `Platform: ${navigator.platform}`,
      formatDiagnosticsBundle(),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(info);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <>
      <div className="space-y-3 text-[11px] text-neutral-500">
        {!hasSupportChannel() ? (
          <p className="leading-relaxed text-neutral-500">
            A public support channel is not set up yet. Use{" "}
            <span className="text-neutral-400">Copy diagnostic info</span> if
            you need to share details with the developer.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
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

      <PrivacyPolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
    </>
  );
}
