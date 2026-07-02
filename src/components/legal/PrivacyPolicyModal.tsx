import { useEffect } from "react";
import { PRIVACY_POLICY } from "../../content/privacyPolicy";
import { PrivacyPolicyBody } from "./PrivacyPolicyBody";

type PrivacyPolicyModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const accentBtn =
    "border-[rgb(var(--if-accent-rgb)/50%)] text-[rgb(var(--if-accent-light-rgb))] hover:border-[rgb(var(--if-accent-light-rgb))] hover:bg-[rgb(var(--if-accent-rgb)/10%)]";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      onClick={onClose}
    >
      <div
        className="zs-panel flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden border border-neutral-700/90 bg-neutral-900/95 shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-neutral-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Legal
              </p>
              <h2
                id="privacy-policy-title"
                className="mt-1 text-base font-semibold text-neutral-100"
              >
                {PRIVACY_POLICY.title}
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500">
                Last updated: {PRIVACY_POLICY.lastUpdated} ·{" "}
                {PRIVACY_POLICY.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close privacy policy"
              className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accentBtn}`}
            >
              Close
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PrivacyPolicyBody />
        </div>
      </div>
    </div>
  );
}
