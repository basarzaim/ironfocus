import { CategoriesPanel } from "../components/dashboard/CategoriesPanel";

export function CategoriesPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
            Categories
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Manage focus domains used across logs and analytics.
          </p>
        </div>
      </header>

      <div className="flex-1">
        <CategoriesPanel />
      </div>
    </div>
  );
}

