import type { VisualQuality } from "../../lib/userPreferences";
import { usePreferences } from "../../state/PreferencesProvider";

export function AppearanceSection() {
  const { preferences, setVisualQuality } = usePreferences();

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold text-neutral-300">
        Visual quality (Iron Core)
      </label>
      <select
        value={preferences.visualQuality}
        onChange={(e) => setVisualQuality(e.target.value as VisualQuality)}
        className="w-full max-w-xs rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5 text-[11px] text-neutral-100 outline-none focus:border-neutral-600"
      >
        <option value="auto">Auto (recommended)</option>
        <option value="high">High — full effects</option>
        <option value="low">Low — better on older GPUs</option>
      </select>
      <p className="text-[11px] leading-relaxed text-neutral-500">
        Low keeps shell spin and core visuals, but turns off bloom, aura
        particles, and caps resolution for smoother performance on older GPUs.
      </p>
    </div>
  );
}
