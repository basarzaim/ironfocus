import type { ReactNode } from "react";
import appLogo from "../../../icon.png";

type NavItem = {
  key: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "analytics", label: "Analytics" },
  { key: "logs", label: "Logs" },
  { key: "categories", label: "Categories" },
  { key: "settings", label: "Settings" },
];

type SidebarItemProps = {
  label: string;
  itemKey: string;
  active?: boolean;
  icon?: ReactNode;
  onSelect?: (key: string) => void;
};

function SidebarItem({ label, itemKey, active, icon, onSelect }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(itemKey)}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-neutral-800 text-neutral-50"
          : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-50"
      }`}
    >
      {icon && <span className="text-neutral-500">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

type SidebarProps = {
  activeKey: string;
  onChange: (key: string) => void;
};

export function Sidebar({ activeKey, onChange }: SidebarProps) {

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-neutral-800 bg-black/90 px-4 py-5">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/60">
          <img
            src={appLogo}
            alt="IronFocus"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            BASAR ZAIM
          </div>
          <div className="mt-1 truncate text-sm font-medium text-neutral-400">
            IronFocus
          </div>
          
        </div>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.key}
            label={item.label}
            itemKey={item.key}
            active={item.key === activeKey}
            onSelect={onChange}
          />
        ))}
      </nav>

      <div className="mt-auto pt-6 text-xs text-neutral-600">
        <div className="font-mono tracking-tight">LOCAL • DESKTOP</div>
      </div>
    </aside>
  );
}

