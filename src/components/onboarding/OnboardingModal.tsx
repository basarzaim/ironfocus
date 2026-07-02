import { useState } from "react";
import { markOnboardingCompleted } from "../../lib/onboarding";
import { ACCENT_BTN } from "../../lib/accentStyles";

const STEPS = [
  {
    title: "Run a focus block",
    body: "Pick a preset or custom minutes on the dial, then press Start. Stop early or let the timer finish — then save the session as a log.",
  },
  {
    title: "Track your work",
    body: "Use Logs and Analytics to review sessions by category. Organize categories from the Categories page.",
  },
  {
    title: "Back up locally",
    body: "Settings → Data lets you export JSON backups and merge imports. Cloud sync will come in a later release.",
  },
] as const;

type OnboardingModalProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const isLast = step >= STEPS.length - 1;

  function finish() {
    markOnboardingCompleted();
    onClose();
  }

  function handleNext() {
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="zs-panel w-full max-w-md border border-neutral-700 bg-neutral-900/95 p-5 shadow-2xl">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2
          id="onboarding-title"
          className="text-base font-semibold text-neutral-100"
        >
          {STEPS[step].title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {STEPS[step].body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-[11px] text-neutral-500 hover:text-neutral-300"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={`rounded-md border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${ACCENT_BTN}`}
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
