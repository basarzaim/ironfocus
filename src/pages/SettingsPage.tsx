import type { ReactNode } from "react";
import { PRODUCT_INFO } from "../config/productInfo";
import { useTheme } from "../state/ThemeProvider";
import { DataManagementSection } from "../components/settings/DataManagementSection";
import { NotificationsSection } from "../components/settings/NotificationsSection";
import { SupportSection } from "../components/settings/SupportSection";

type SettingsPageProps = {
  onReplayOnboarding: () => void;
};

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-[11px] text-neutral-500">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SettingsPage({ onReplayOnboarding }: SettingsPageProps) {
  const { theme, setTheme, colorMode, setColorMode } = useTheme();
  const isRose = theme === "rose";
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
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/90">
          Beta
        </span>
      </header>

      <section className="zs-panel flex-1 overflow-y-auto border border-neutral-800 bg-neutral-900/80 p-4 text-xs text-neutral-500">
        <div className="mb-4 text-[11px] text-neutral-400">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
            {PRODUCT_INFO.name} {PRODUCT_INFO.label}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Early access on the Microsoft Store. Features may change — export
            your data regularly until cloud sync arrives.
          </div>
          <div className="mt-2 space-y-0.5 text-[11px]">
            <div>
              <span className="font-semibold text-neutral-300">Version:</span>{" "}
              {PRODUCT_INFO.version} ({PRODUCT_INFO.label})
            </div>
            <div>
              <span className="font-semibold text-neutral-300">Channel:</span>{" "}
              {PRODUCT_INFO.channel}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsSection
            title="Appearance"
            description="Accent theme and color mode (stored locally)."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-neutral-300">Accent theme</span>
                <div className="inline-flex rounded-full border border-neutral-700 bg-neutral-950/60 p-[2px] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTheme("classic")}
                    className={`rounded-full px-3 py-1 ${
                      !isRose
                        ? "bg-neutral-200 text-neutral-900"
                        : "text-neutral-400 hover:text-neutral-100"
                    }`}
                  >
                    Classic
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("rose")}
                    className={`rounded-full px-3 py-1 ${
                      isRose
                        ? "bg-pink-500/90 text-neutral-50"
                        : "text-neutral-400 hover:text-neutral-100"
                    }`}
                  >
                    Rose
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-neutral-300">Color mode</span>
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
            </div>
          </SettingsSection>

          <SettingsSection title="Notifications & sound">
            <NotificationsSection />
          </SettingsSection>

          <SettingsSection title="Data">
            <DataManagementSection />
          </SettingsSection>

          <SettingsSection title="Help & support">
            <SupportSection onReplayOnboarding={onReplayOnboarding} />
          </SettingsSection>
        </div>
      </section>
    </div>
  );
}
