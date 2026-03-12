import { PRODUCT_INFO } from "../config/productInfo";

export function SettingsPage() {
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
          Settings such as data retention, export, theme tuning, and
          persistence will be introduced in future versions.
        </div>
      </section>
    </div>
  );
}

