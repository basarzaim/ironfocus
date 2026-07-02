import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

import { STORAGE_KEYS } from "../../lib/storageKeys";
import { getPersistedValue, setPersistedValue } from "../../lib/persistence/persistenceClient";

export type AppViewKey =
  | "focus"
  | "logs"
  | "categories"
  | "analytics"
  | "settings";

const SIDEBAR_COLLAPSED_KEY = STORAGE_KEYS.sidebarCollapsed;

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return getPersistedValue(SIDEBAR_COLLAPSED_KEY) === "1";
}

type AppShellProps = {
  children: ReactNode;
  activeView: AppViewKey;
  onChangeView: (view: AppViewKey) => void;
};

export function AppShell({ children, activeView, onChangeView }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarCollapsed,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPersistedValue(
      SIDEBAR_COLLAPSED_KEY,
      sidebarCollapsed ? "1" : "0",
    );
  }, [sidebarCollapsed]);

  return (
    <div className="if-app-shell flex h-screen w-screen bg-neutral-950 text-neutral-100">
      <Sidebar
        activeKey={activeView}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onChange={(key) => onChangeView(key as AppViewKey)}
      />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 md:px-8">
        <div className="mx-auto flex min-h-full max-w-6xl flex-col pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}
