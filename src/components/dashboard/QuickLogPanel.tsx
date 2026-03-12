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

  const hasRequiredFields =
    title.trim().length > 0 && categoryId && startTime && endTime;

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
    <section className="zs-panel mb-4 flex flex-col gap-4 border border-neutral-800 bg-neutral-900/80 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
          Quick Log
        </h2>
        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Manual Entry
        </span>
      </header>

      <form
        className="space-y-3"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-sm text-neutral-100 outline-none ring-0 transition-colors placeholder:text-neutral-600 focus:border-amber-500/70"
              placeholder="What did you work on?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
              >
                <option value="">Select</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-400">
                Tags
              </label>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
                placeholder="Comma separated"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              Start
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              End
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-amber-500/70"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-400">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-amber-500/70"
              placeholder="Optional"
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-md border border-amber-500/60 bg-amber-600/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-950 shadow-sm transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
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

