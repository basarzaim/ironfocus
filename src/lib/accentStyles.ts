/** Shared Tailwind fragments driven by html[data-accent] CSS tokens. */

export const ACCENT_FOCUS = "focus:border-[rgb(var(--if-accent-rgb)/70%)]";

export const ACCENT_BTN =
  "border-[rgb(var(--if-accent-rgb)/60%)] bg-[rgb(var(--if-accent-strong-rgb)/80%)] text-[var(--if-accent-on)] hover:bg-[rgb(var(--if-accent-rgb))]";

export const ACCENT_BTN_PRIMARY =
  "border-[rgb(var(--if-accent-rgb)/60%)] bg-[rgb(var(--if-accent-rgb))] text-[var(--if-accent-on)] shadow-md shadow-[rgb(var(--if-accent-rgb)/30%)] ring-1 ring-[rgb(var(--if-accent-rgb)/40%)] hover:bg-[rgb(var(--if-accent-light-rgb))]";

export const ACCENT_FIELD_FOCUS =
  "outline-none transition-colors placeholder:text-neutral-600";

export function accentFieldClass(extra = ""): string {
  return `border border-neutral-800/80 bg-neutral-950/60 text-neutral-100 ${ACCENT_FIELD_FOCUS} ${ACCENT_FOCUS} ${extra}`.trim();
}

export const ACCENT_CALLOUT =
  "rounded-md border border-[rgb(var(--if-accent-rgb)/30%)] bg-[rgb(var(--if-accent-rgb)/10%)] text-[rgb(var(--if-accent-light-rgb)/90%)]";

export const ACCENT_CALLOUT_BTN =
  "rounded-md border border-[rgb(var(--if-accent-rgb)/40%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--if-accent-light-rgb))]";

/** Plasma / reactor timer overlay (light mono). */
export const ACCENT_TIMER_OVERLAY =
  "select-none font-mono text-2xl font-light tracking-widest text-[rgb(var(--if-accent-light-rgb)/85%)] drop-shadow-[0_1px_8px_rgb(var(--if-accent-rgb)/50%)]";

/** Focus-mode dial timer — heavy legibility shadow with accent glow. */
export const ACCENT_TIMER_DIAL =
  "relative z-10 select-none font-mono text-2xl font-medium tracking-widest text-neutral-50 [text-shadow:0_0_28px_rgba(0,0,0,1),0_0_12px_rgba(0,0,0,0.95),0_2px_6px_rgba(0,0,0,0.9),0_0_14px_rgb(var(--if-accent-light-rgb)/0.35)]";

export const ACCENT_CHECKBOX =
  "rounded border-neutral-700 bg-neutral-900 text-[rgb(var(--if-accent-rgb))] focus:ring-[rgb(var(--if-accent-rgb)/40%)]";

export const ACCENT_BTN_SOFT =
  "border-[rgb(var(--if-accent-rgb)/50%)] text-[rgb(var(--if-accent-light-rgb))] hover:border-[rgb(var(--if-accent-light-rgb))] hover:bg-[rgb(var(--if-accent-rgb)/10%)]";

/** Product channel badge — neutral, not user accent. */
export const CHANNEL_BADGE =
  "rounded-full border border-neutral-600/40 bg-neutral-800/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400";

export const CHANNEL_BADGE_COMPACT =
  "shrink-0 rounded border border-neutral-600/35 bg-neutral-800/50 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-neutral-400";

/** Selected Classic card in accent picker (uses live accent tokens). */
export const ACCENT_CARD_SELECTED =
  "border-[rgb(var(--if-accent-rgb)/50%)] bg-[rgb(var(--if-accent-rgb)/10%)]";
