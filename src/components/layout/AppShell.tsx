import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export type AppViewKey =
  | "dashboard"
  | "logs"
  | "categories"
  | "analytics"
  | "settings";

type AppShellProps = {
  children: ReactNode;
  activeView: AppViewKey;
  onChangeView: (view: AppViewKey) => void;
};

export function AppShell({ children, activeView, onChangeView }: AppShellProps) {
  return (
    <div className="if-app-shell flex h-screen w-screen bg-neutral-950 text-neutral-100">
      <Sidebar
        activeKey={activeView}
        onChange={(key) => onChangeView(key as AppViewKey)}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6">
        <div className="mx-auto flex min-h-full max-w-6xl flex-col pb-10">
          {children}
        </div>
      </main>
    </div>
  );
}

