import { ACCENT_IDS, useTheme, type AccentId } from "../../state/ThemeProvider";

const ACCENT_SWATCH_HEX: Record<Exclude<AccentId, "classic">, string> = {
  pink: "#ec4899",
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  red: "#ef4444",
  turquoise: "#14b8a6",
};

const ACCENT_LABELS: Record<AccentId, string> = {
  classic: "Classic",
  pink: "Pink accent",
  blue: "Blue accent",
  purple: "Purple accent",
  green: "Green accent",
  red: "Red accent",
  turquoise: "Turquoise accent",
};

export function AccentSection() {
  const { accentId, setAccentId } = useTheme();
  const isClassic = accentId === "classic";
  const swatchIds = ACCENT_IDS.filter((id) => id !== "classic") as Exclude<
    AccentId,
    "classic"
  >[];

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setAccentId("classic")}
        aria-pressed={isClassic}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
          isClassic
            ? "border-amber-500/50 bg-amber-500/10"
            : "border-neutral-800 bg-neutral-950/40 hover:border-neutral-700"
        }`}
      >
        <span>
          <span className="block text-[11px] font-semibold text-neutral-200">
            Classic <span className="text-neutral-500">(recommended)</span>
          </span>
          <span className="block text-[10px] text-neutral-500">
            Default iron-core look
          </span>
        </span>
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-black/20"
          style={{ backgroundColor: "#f59e0b" }}
          aria-hidden="true"
        />
      </button>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-neutral-500">
          Or pick an accent color
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {swatchIds.map((id) => {
            const selected = accentId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccentId(id)}
                aria-pressed={selected}
                aria-label={ACCENT_LABELS[id]}
                className={`h-6 w-6 shrink-0 rounded-full transition ${
                  selected
                    ? "ring-2 ring-white/80 ring-offset-2 ring-offset-neutral-900"
                    : "ring-1 ring-black/20 hover:ring-white/40"
                }`}
                style={{ backgroundColor: ACCENT_SWATCH_HEX[id] }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
