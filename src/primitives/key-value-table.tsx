import type { KeyValueEntry } from "@/core/models/primitives";
import { cn } from "@/lib/cn";
import { generateId } from "@/lib/id";

interface KeyValueTableProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
}

export function KeyValueTable({
  entries,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  readOnly = false,
}: KeyValueTableProps) {
  const updateEntry = (index: number, patch: Partial<KeyValueEntry>) => {
    const updated = entries.map((e, i) =>
      i === index ? { ...e, ...patch } : e,
    );
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    onChange([
      ...entries,
      { id: generateId(), key: "", value: "", enabled: true },
    ]);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "key" | "value",
  ) => {
    if (e.key === "Tab" && !e.shiftKey && field === "value" && index === entries.length - 1) {
      e.preventDefault();
      addEntry();
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-0 text-xs border border-border-subtle rounded-md overflow-hidden">
        <div className="contents text-text-muted font-medium bg-surface-raised">
          <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle" />
          <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle">
            {keyPlaceholder}
          </div>
          <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle">
            {valuePlaceholder}
          </div>
          <div className="px-2 py-1.5 bg-surface-raised border-b border-border-subtle" />
        </div>

        {entries.map((entry, i) => (
          <div key={entry.id} className="contents group">
            <div className="flex items-center justify-center px-2 py-1 border-b border-border-subtle">
              <input
                type="checkbox"
                checked={entry.enabled}
                onChange={(e) =>
                  updateEntry(i, { enabled: e.target.checked })
                }
                disabled={readOnly}
                className="accent-accent-purple h-3.5 w-3.5"
              />
            </div>
            <div className="border-b border-border-subtle">
              <input
                value={entry.key}
                onChange={(e) => updateEntry(i, { key: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, i, "key")}
                placeholder={keyPlaceholder}
                readOnly={readOnly}
                className={cn(
                  "w-full bg-transparent text-text-primary px-2 py-1.5 outline-none",
                  "placeholder:text-text-muted/50",
                  !entry.enabled && "opacity-40",
                )}
              />
            </div>
            <div className="border-b border-border-subtle">
              <input
                value={entry.value}
                onChange={(e) => updateEntry(i, { value: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, i, "value")}
                placeholder={valuePlaceholder}
                readOnly={readOnly}
                className={cn(
                  "w-full bg-transparent text-text-primary px-2 py-1.5 outline-none",
                  "placeholder:text-text-muted/50",
                  !entry.enabled && "opacity-40",
                )}
              />
            </div>
            <div className="flex items-center px-1 border-b border-border-subtle">
              {!readOnly && (
                <button
                  onClick={() => removeEntry(i)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-0.5 rounded"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <button
          onClick={addEntry}
          className="mt-2 text-xs text-text-muted hover:text-accent-purple transition-colors"
        >
          + Add row
        </button>
      )}
    </div>
  );
}
