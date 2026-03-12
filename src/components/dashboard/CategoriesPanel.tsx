import { useState } from "react";
import { useAppState } from "../../state/AppStateProvider";

export function CategoriesPanel() {
  const {
    categories,
    addCategory,
    updateCategory,
    updateCategoryColor,
    deleteCategory,
  } = useAppState();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const canAdd = newName.trim().length > 0;

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
    <section className="zs-panel border border-neutral-800 bg-neutral-900/80 p-6 min-h-[480px]">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
          Categories
        </h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Local Only
        </span>
      </header>

      <div className="space-y-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add new category"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
          />
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (!canAdd) return;
              addCategory(newName);
              setNewName("");
            }}
            className="inline-flex items-center justify-center rounded-md border border-amber-500/60 bg-amber-600/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-950 shadow-sm transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
          >
            Add
          </button>
        </div>

        <div className="-mx-1 max-h-80 overflow-auto px-1">
          {categories.length === 0 ? (
            <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-neutral-800/80 text-xs text-neutral-500">
              No categories defined.
            </div>
          ) : (
            <ul className="space-y-1 text-xs text-neutral-200">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center gap-2 rounded-md border border-neutral-800/70 bg-neutral-950/40 px-2 py-1.5"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-700"
                      style={{
                        backgroundColor: cat.color ?? "transparent",
                      }}
                    />
                    <input
                      type="color"
                      aria-label={`Color for ${cat.name}`}
                      value={cat.color ?? "#fbbf24"}
                      onChange={(e) => updateCategoryColor(cat.id, e.target.value)}
                      className="h-5 w-5 cursor-pointer rounded border border-neutral-700 bg-neutral-900 p-0 [color-scheme:dark]"
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
                      className="flex-1 rounded-sm border border-neutral-700 bg-neutral-950/70 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(cat.id, cat.name)}
                      className="flex-1 truncate text-left text-xs text-neutral-200 hover:text-neutral-50"
                    >
                      {cat.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="text-[11px] text-neutral-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

