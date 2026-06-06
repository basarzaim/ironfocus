import { useState } from "react";
import { useAppState } from "../../state/AppStateProvider";
import { useTheme } from "../../state/ThemeProvider";

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
  const { theme } = useTheme();
  const isWife = theme === "wife";

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
              className={`flex-1 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 ${
                isWife
                  ? "focus:border-pink-500/70"
                  : "focus:border-amber-500/70"
              }`}
            />
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (!canAdd) return;
              addCategory(newName);
              setNewName("");
            }}
            className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${
              isWife
                ? "border-pink-500/60 bg-pink-600/80 text-neutral-50 hover:bg-pink-500"
                : "border-amber-500/60 bg-amber-600/80 text-neutral-950 hover:bg-amber-500"
            }`}
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
            <ul
              className="space-y-1 text-xs text-neutral-200"
              onMouseUp={() => setDraggingId(null)}
            >
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  onMouseEnter={() => {
                    if (!draggingId || draggingId === cat.id) return;
                    reorderCategories(draggingId, cat.id);
                  }}
                  className={`flex items-center gap-2 rounded-md border border-neutral-800/70 bg-neutral-950/40 px-2 py-1.5 transition-all duration-150 ${
                    draggingId === cat.id
                      ? "opacity-80 translate-x-1 translate-y-0.5"
                      : "opacity-100 translate-x-0 translate-y-0"
                  }`}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      setDraggingId(cat.id);
                    }}
                    className="flex h-6 w-4 items-center justify-center cursor-grab text-neutral-600 hover:text-neutral-300"
                    aria-label={`Reorder ${cat.name}`}
                  >
                    <span className="inline-block text-[14px] leading-none">
                      ☰
                    </span>
                  </button>
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
                      value={cat.color ?? (isWife ? "#ec4899" : "#fbbf24")}
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
                      className={`flex-1 rounded-sm border border-neutral-700 bg-neutral-950/70 px-2 py-1 text-xs text-neutral-100 outline-none ${
                        isWife
                          ? "focus:border-pink-500/70"
                          : "focus:border-amber-500/70"
                      }`}
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

