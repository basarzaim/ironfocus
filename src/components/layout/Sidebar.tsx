import type { ReactNode } from "react";
import appLogo from "../../../icon.png";
import { PRODUCT_INFO } from "../../config/productInfo";
import { CHANNEL_BADGE_COMPACT } from "../../lib/accentStyles";

type NavItem = {
  key: string;
  label: string;
  icon: ReactNode;
};

const iconClass = "h-[18px] w-[18px] shrink-0";

const NAV_ITEMS: NavItem[] = [
  {
    key: "focus",
    label: "Focus",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="13" r="8" />
        <path strokeLinecap="round" d="M12 5V3M12 5c-1.2 0-2.2.8-2.5 2" />
        <path strokeLinecap="round" d="M12 13l3-2" />
      </svg>
    ),
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" d="M4 19V5M4 19h16" />
        <path strokeLinecap="round" d="M8 17V11M12 17V7M16 17v-4" />
      </svg>
    ),
  },
  {
    key: "logs",
    label: "Logs",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    key: "categories",
    label: "Categories",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" d="M4 7h7v7H4zM13 7h7v4h-7zM13 13h7v4h-7z" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
      </svg>
    ),
  },
];

type SidebarItemProps = {
  label: string;
  itemKey: string;
  active?: boolean;
  icon: ReactNode;
  collapsed?: boolean;
  onSelect?: (key: string) => void;
};

function SidebarItem({
  label,
  itemKey,
  active,
  icon,
  collapsed,
  onSelect,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(itemKey)}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`group relative flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200 ${
        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2"
      } ${
        active
          ? "bg-[rgb(var(--if-accent-rgb)/15%)] text-[rgb(var(--if-accent-light-rgb))] ring-1 ring-[rgb(var(--if-accent-rgb)/30%)]"
          : "text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-100"
      }`}
    >
      <span
        className={`transition-colors ${
          active
            ? "text-[rgb(var(--if-accent-light-rgb))]"
            : "text-neutral-500 group-hover:text-neutral-300"
        }`}
      >
        {icon}
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
      {collapsed && active ? (
        <span
          className="absolute -right-0.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[rgb(var(--if-accent-light-rgb))]"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

type SidebarProps = {
  activeKey: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChange: (key: string) => void;
};

export function Sidebar({
  activeKey,
  collapsed,
  onToggleCollapsed,
  onChange,
}: SidebarProps) {
  return (
    <aside
      className={`if-sidebar flex h-screen shrink-0 flex-col border-r border-neutral-800/80 bg-black/90 transition-[width,padding] duration-300 ease-out ${
        collapsed ? "w-[4.25rem] px-2 py-4" : "w-56 px-4 py-5"
      }`}
    >
      <div
        className={`mb-6 flex items-center ${
          collapsed ? "justify-center px-0" : "gap-3 px-1"
        }`}
      >
        <div className="if-sidebar-logo-box flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 ring-1 ring-white/[0.04]">
          <img src={appLogo} alt="IronFocus" className="h-full w-full object-contain" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[rgb(var(--if-accent-light-rgb))]">
              BASAR ZAIM
            </div>
            <div className="if-sidebar-brand mt-0.5 flex items-center gap-2 truncate text-sm font-medium text-neutral-400">
              <span className="truncate">IronFocus</span>
              {PRODUCT_INFO.channel === "Beta" ? (
                <span className={CHANNEL_BADGE_COMPACT}>
                  Beta
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.key}
            label={item.label}
            itemKey={item.key}
            icon={item.icon}
            active={item.key === activeKey}
            collapsed={collapsed}
            onSelect={onChange}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        {!collapsed ? (
          <div className="if-sidebar-footer px-1 text-[10px] text-neutral-600">
            <div className="font-mono tracking-tight">LOCAL • DESKTOP</div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex w-full items-center rounded-xl border border-neutral-800/80 bg-neutral-950/50 text-neutral-500 transition-colors hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-300 ${
            collapsed ? "justify-center py-2.5" : "gap-2 px-3 py-2"
          }`}
        >
          <svg
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          {!collapsed ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
              Collapse
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  );
}
