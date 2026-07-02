import { FormEvent, useState } from "react";
import { useAppState } from "../../state/AppStateProvider";

export function QuickLogPanel() {
  const { categories, addLogFromForm } = useAppState();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasRequiredFields = categoryId && startTime && endTime;

  const accentFocus = "focus:border-[rgb(var(--if-accent-rgb)/70%)]";
  const accentBtn =
    "border-[rgb(var(--if-accent-rgb)/60%)] bg-[rgb(var(--if-accent-strong-rgb)/80%)] text-[var(--if-accent-on)] hover:bg-[rgb(var(--if-accent-rgb))]";
  const fieldClass = `w-full rounded-lg border border-neutral-800/80 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 ${accentFocus}`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = addLogFromForm({
      title,
      categoryId,
      tagsRaw,
      startTime,
      endTime,
      notes,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setTitle("");
    setCategoryId("");
    setTagsRaw("");
    setStartTime("");
    setEndTime("");
    setNotes("");
  }

  return (
    <section className="zs-panel overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 p-4 ring-1 ring-white/[0.03] md:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Manual entry
          </p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-wide text-neutral-100">
            Quick Log
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-neutral-800/80 bg-[rgb(var(--if-accent-rgb)/10%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--if-accent-light-rgb)/90%)]">
          Add session
        </span>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${fieldClass} py-2.5 text-sm`}
              placeholder="What did you work on?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={fieldClass}
              >
                <option value="" className="bg-neutral-900 text-neutral-200">
                  Select
                </option>
                {categories.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    className="bg-neutral-900 text-neutral-100"
                  >
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Tags
              </label>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                className={fieldClass}
                placeholder="Comma separated"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Start
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              End
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={fieldClass}
              placeholder="Optional"
            />
          </div>

          <button
            type="submit"
            className={`mt-2 inline-flex items-center justify-center rounded-full border px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-sm transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 ${accentBtn}`}
            disabled={!hasRequiredFields}
          >
            Add Log
          </button>
        </div>

        {error ? (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
