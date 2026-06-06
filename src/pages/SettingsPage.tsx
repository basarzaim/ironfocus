import { PRODUCT_INFO } from "../config/productInfo";
import { useTheme } from "../state/ThemeProvider";

export function SettingsPage() {
  const { theme, setTheme, colorMode, setColorMode } = useTheme();
  const isWife = theme === "wife";
  const isLight = colorMode === "light";

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
            Settings
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Preferences and version information for your local focus console.
          </p>
        </div>
      </header>

      <section className="zs-panel flex-1 border border-neutral-800 bg-neutral-900/80 p-4 text-xs text-neutral-500">
        <div className="mb-4 text-[11px] text-neutral-400">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
            {PRODUCT_INFO.name} {PRODUCT_INFO.label}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            This is the first beta baseline for IronFocus. Future versions will
            evolve on top of this build.
          </div>
        </div>

        <div className="mt-2 space-y-1 text-[11px] text-neutral-500">
          <div>
            <span className="font-semibold text-neutral-300">Version:</span>{" "}
            {PRODUCT_INFO.version} ({PRODUCT_INFO.label})
          </div>
          <div>
            <span className="font-semibold text-neutral-300">Channel:</span>{" "}
            {PRODUCT_INFO.channel}
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-800 pt-3 text-[11px] text-neutral-500">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-neutral-300">
              Theme (local only)
            </span>
            <div className="inline-flex rounded-full border border-neutral-700 bg-neutral-950/60 p-[2px] text-[11px]">
              <button
                type="button"
                onClick={() => setTheme("classic")}
                className={`rounded-full px-3 py-1 ${
                  !isWife
                    ? "bg-neutral-200 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                Classic
              </button>
              <button
                type="button"
                onClick={() => setTheme("wife")}
                className={`rounded-full px-3 py-1 ${
                  isWife
                    ? "bg-pink-500/90 text-neutral-50"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                Wife edition
              </button>
            </div>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            This toggle is purely local; it switches between the original amber
            accent and the pink "wife edition" theme.
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-800 pt-3 text-[11px] text-neutral-500">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-neutral-300">
              Color mode (local only)
            </span>
            <div className="inline-flex rounded-full border border-neutral-700 bg-neutral-950/60 p-[2px] text-[11px]">
              <button
                type="button"
                onClick={() => setColorMode("dark")}
                className={`rounded-full px-3 py-1 ${
                  !isLight
                    ? "bg-neutral-200 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setColorMode("light")}
                className={`rounded-full px-3 py-1 ${
                  isLight
                    ? "bg-neutral-200 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
              >
                Light
              </button>
            </div>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Switches the overall UI between dark and light backgrounds while
            keeping your selected accent theme.
          </div>
        </div>
      </section>
    </div>
  );
}

