import { CategoriesPanel } from "../components/dashboard/CategoriesPanel";
import { useAppState } from "../state/AppStateProvider";

export function CategoriesPage() {
  const { categories } = useAppState();

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/60 px-5 py-4 ring-1 ring-white/[0.03]">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl bg-[rgb(var(--if-accent-rgb)/10%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Focus domains
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-50">
              Categories
            </h1>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
              Manage focus domains used across logs and analytics.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full border border-neutral-800/80 bg-[rgb(var(--if-accent-rgb)/10%)] px-3 py-1 text-[11px] font-medium tabular-nums text-[rgb(var(--if-accent-light-rgb)/90%)]">
            {categories.length}{" "}
            {categories.length === 1 ? "category" : "categories"}
          </span>
        </div>
      </header>

      <div className="flex-1">
        <CategoriesPanel />
      </div>
    </div>
  );
}
