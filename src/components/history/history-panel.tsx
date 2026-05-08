import { useState, useMemo } from "react";
import { useHistoryStore } from "@/stores/history-store";
import { useRequestStore } from "@/stores/request-store";
import { MethodBadge, StatusBadge } from "@/primitives/badge";
import { Input } from "@/primitives/input";
import { formatTimestamp, formatDuration, getDateGroup } from "@/lib/format";
import type { HistoryEntry } from "@/core/models/history";

export function HistoryPanel() {
  const [search, setSearch] = useState("");
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const openTabs = useRequestStore((s) => s.openTabs);
  const entries = useHistoryStore((s) => s.entries);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);
  const clearHistory = useHistoryStore((s) => s.clearRequestHistory);

  const activeTab = useMemo(
    () => openTabs.find((t) => t.id === activeTabId),
    [openTabs, activeTabId],
  );

  const filteredEntries = useMemo(() => {
    if (!activeTab) return [];
    let result = entries.filter((e) => e.requestId === activeTab.requestId);
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.resolvedRequest.url.toLowerCase().includes(lower) ||
          e.resolvedRequest.method.toLowerCase().includes(lower),
      );
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, activeTab, search]);

  const grouped = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          History
        </span>
        {activeTab && filteredEntries.length > 0 && (
          <button
            onClick={() => clearHistory(activeTab.requestId)}
            className="text-[10px] text-text-muted hover:text-danger transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history..."
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-text-muted">
              {activeTab ? "No history yet" : "Select a request"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateEntries]) => (
            <div key={date} className="mb-3">
              <div className="text-[10px] text-text-muted uppercase font-medium px-1 py-1">
                {date}
              </div>
              {dateEntries.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  entry,
  onDelete,
}: {
  entry: HistoryEntry;
  onDelete: () => void;
}) {
  let pathname: string;
  try {
    pathname = new URL(entry.resolvedRequest.url).pathname;
  } catch {
    pathname = entry.resolvedRequest.url;
  }

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover/50 cursor-pointer">
      <MethodBadge method={entry.resolvedRequest.method} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-primary truncate font-mono">
          {pathname}
        </div>
      </div>
      <StatusBadge code={entry.response.statusCode} />
      <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
        {formatDuration(entry.response.timing.totalMs)}
      </span>
      <span className="text-[10px] text-text-muted whitespace-nowrap">
        {formatTimestamp(entry.timestamp)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-0.5"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const groups: Record<string, HistoryEntry[]> = {};
  for (const entry of entries) {
    const group = getDateGroup(entry.timestamp);
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }
  return groups;
}
