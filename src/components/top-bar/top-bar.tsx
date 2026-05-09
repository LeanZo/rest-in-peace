import { useState, useRef, useMemo } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useRequestStore } from "@/stores/request-store";
import { useCollectionStore } from "@/stores/collection-store";
import { EnvironmentSelector } from "./environment-selector";
import { MethodBadge } from "@/primitives/badge";
import { cn } from "@/lib/cn";
import type { RequestConfig } from "@/core/models/request";
import ripIcon from "@/media/images/REST in Peace - Outline - 90.png";

export function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleHistory = useUIStore((s) => s.toggleHistoryPanel);
  const historyOpen = useUIStore((s) => s.historyPanelOpen);
  const openTabs = useRequestStore((s) => s.openTabs);
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const drafts = useRequestStore((s) => s.drafts);
  const setActiveTab = useRequestStore((s) => s.setActiveTab);
  const closeTab = useRequestStore((s) => s.closeTab);
  const reorderTab = useRequestStore((s) => s.reorderTab);
  const syncRequestName = useRequestStore((s) => s.syncRequestName);
  const updateRequest = useCollectionStore((s) => s.updateRequest);
  const dragIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const activeCollectionId = useMemo(() => {
    if (!activeTabId) return null;
    const draft = drafts.get(activeTabId);
    return draft?.collectionId ?? null;
  }, [drafts, activeTabId]);

  return (
    <div className="h-12 flex items-center bg-surface-raised border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-2 px-3 min-w-[180px]">
        <button
          onClick={toggleSidebar}
          className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-hover"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-accent-purple/20 flex items-center justify-center">
            <div
              className="text-accent-purple"
              style={{
                width: 12,
                height: 12,
                WebkitMaskImage: `url(${ripIcon})`,
                maskImage: `url(${ripIcon})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                backgroundColor: "currentColor",
              }}
            />
          </div>
          <span className="text-sm font-semibold text-text-primary tracking-tight">
            REST in Peace
          </span>
        </div>
      </div>

      <div
        className="flex-1 flex items-center gap-0.5 overflow-x-auto px-1 scrollbar-none"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (dragIndexRef.current !== null && dropIndex !== null && dragIndexRef.current !== dropIndex) {
            reorderTab(dragIndexRef.current, dropIndex);
          }
          dragIndexRef.current = null;
          setDropIndex(null);
        }}
      >
        {openTabs.map((tab, index) => {
          const draft = drafts.get(tab.id);
          return (
            <TabButton
              key={tab.id}
              draft={draft}
              index={index}
              isActive={tab.id === activeTabId}
              isDirty={tab.isDirty}
              isDropTarget={dropIndex === index}
              onClick={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onRename={(name) => {
                if (!draft) return;
                updateRequest(draft.id, { name });
                syncRequestName(draft.id, name);
              }}
              onDragStart={() => { dragIndexRef.current = index; }}
              onDragOver={() => setDropIndex(index)}
              onDragEnd={() => { dragIndexRef.current = null; setDropIndex(null); }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-3">
        <EnvironmentSelector collectionId={activeCollectionId} />
        <button
          onClick={toggleHistory}
          className={cn(
            "p-1.5 rounded transition-colors",
            historyOpen
              ? "text-accent-purple bg-accent-purple/10"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover",
          )}
          title="Toggle history"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TabButton({
  draft,
  index,
  isActive,
  isDirty,
  isDropTarget,
  onClick,
  onClose,
  onRename,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  draft: RequestConfig | undefined;
  index: number;
  isActive: boolean;
  isDirty: boolean;
  isDropTarget: boolean;
  onClick: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  if (!draft) return null;

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(draft.name);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== draft.name) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <button
      draggable={!editing}
      onClick={onClick}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.style.opacity = "0.4";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = "";
        onDragEnd();
      }}
      className={cn(
        "group flex items-center gap-1.5 px-3 h-8 text-xs rounded-md transition-all duration-150 shrink-0 max-w-[200px]",
        isActive
          ? "bg-surface-base text-text-primary"
          : "text-text-muted hover:text-text-secondary hover:bg-surface-hover/50",
        isDropTarget && "ring-1 ring-accent-purple/50",
      )}
    >
      <MethodBadge method={draft.method} size="sm" />
      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent outline-none border-b border-accent-purple text-xs w-24 text-text-primary"
        />
      ) : (
        <span className="truncate" onDoubleClick={startEdit}>
          {draft.name || "Untitled"}
        </span>
      )}
      {isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />
      )}
      <span
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="opacity-0 group-hover:opacity-100 hover:text-text-primary p-0.5 rounded transition-opacity"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    </button>
  );
}
