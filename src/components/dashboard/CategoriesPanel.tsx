import { useState } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { ACCENT_BTN, accentFieldClass } from "../../lib/accentStyles";
import { getCssAccentColor } from "../../lib/accentColor";

export function CategoriesPanel() {
  const {
    categories,
    addCategory,
    updateCategory,
    updateCategoryColor,
    deleteCategory,
    reorderCategories,
  } = useAppState();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const canAdd = newName.trim().length > 0;

  const fieldClass = accentFieldClass("rounded-lg px-3 py-2 text-xs");

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function commitEdit() {
    if (!editingId || editingName.trim().length === 0) {
      setEditingId(null);
      return;
    }
    updateCategory(editingId, editingName);
    setEditingId(null);
  }

  return (
    <section className="zs-panel flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 ring-1 ring-white/[0.03]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800/60 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Library
          </p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
            Your categories
          </h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Drag to reorder · click name to rename
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-neutral-800/80 bg-neutral-950/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Local only
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              New category
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canAdd) {
                  e.preventDefault();
                  addCategory(newName);
                  setNewName("");
                }
              }}
              placeholder="e.g. Deep work, Reading, Code review…"
              className={`w-full ${fieldClass}`}
            />
          </div>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (!canAdd) return;
              addCategory(newName);
              setNewName("");
            }}
            className={`inline-flex shrink-0 items-center justify-center rounded-full border px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${ACCENT_BTN}`}
          >
            Add category
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {categories.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-950/30 px-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800/80 bg-neutral-950/50 text-[rgb(var(--if-accent-light-rgb)/70%)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M4 7h7v7H4zM13 7h7v4h-7zM13 13h7v4h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">
                  No categories yet
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Add your first focus domain above to tag sessions and logs.
                </p>
              </div>
            </div>
          ) : (
            <ul
              className="space-y-2"
              onMouseUp={() => setDraggingId(null)}
            >
              {categories.map((cat) => {
                const swatch = cat.color ?? getCssAccentColor("if-accent");

                return (
                  <li
                    key={cat.id}
                    onMouseEnter={() => {
                      if (!draggingId || draggingId === cat.id) return;
                      reorderCategories(draggingId, cat.id);
                    }}
                    className={`group flex items-center gap-3 rounded-xl border border-neutral-800/70 bg-neutral-950/40 px-3 py-2.5 transition-all duration-150 hover:border-neutral-700/80 hover:bg-neutral-950/70 ${
                      draggingId === cat.id
                        ? "scale-[1.01] border-neutral-600/80 opacity-90 shadow-lg shadow-black/20"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        setDraggingId(cat.id);
                      }}
                      className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-900 hover:text-neutral-400 active:cursor-grabbing"
                      aria-label={`Reorder ${cat.name}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="currentColor"
                        aria-hidden
                      >
                        <circle cx="9" cy="7" r="1.2" />
                        <circle cx="15" cy="7" r="1.2" />
                        <circle cx="9" cy="12" r="1.2" />
                        <circle cx="15" cy="12" r="1.2" />
                        <circle cx="9" cy="17" r="1.2" />
                        <circle cx="15" cy="17" r="1.2" />
                      </svg>
                    </button>

                    <div
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800/80"
                      style={{ backgroundColor: `${swatch}22` }}
                    >
                      <span
                        className="h-4 w-4 rounded-full ring-2 ring-white/10"
                        style={{ backgroundColor: swatch }}
                        aria-hidden
                      />
                      <input
                        type="color"
                        aria-label={`Color for ${cat.name}`}
                        value={swatch}
                        onChange={(e) =>
                          updateCategoryColor(cat.id, e.target.value)
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </div>

                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit();
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className={`min-w-0 flex-1 ${fieldClass} py-1.5`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(cat.id, cat.name)}
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-neutral-200 transition-colors hover:text-neutral-50"
                      >
                        {cat.name}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteCategory(cat.id)}
                      className="shrink-0 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-neutral-500 opacity-70 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
