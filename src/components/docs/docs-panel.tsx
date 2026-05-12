import { useState } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { useRequestStore } from "@/stores/request-store";
import { DocsEditor } from "./docs-editor";
import type { EntityId } from "@/core/models/primitives";

interface DocsPanelProps {
  tabId: string;
  type: "collection" | "folder";
  entityId: EntityId;
}

export function DocsPanel({ tabId, type, entityId }: DocsPanelProps) {
  const collection = useCollectionStore((s) =>
    type === "collection" ? s.collections.find((c) => c.id === entityId) : null,
  );
  const folder = useCollectionStore((s) =>
    type === "folder" ? s.folders.get(entityId) : null,
  );
  const updateCollection = useCollectionStore((s) => s.updateCollection);
  const renameFolder = useCollectionStore((s) => s.renameFolder);
  const docs = useRequestStore((s) => s.docsDrafts.get(tabId) ?? "");
  const updateDocsDraft = useRequestStore((s) => s.updateDocsDraft);

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const entity = type === "collection" ? collection : folder;
  if (!entity) return null;

  const startEdit = () => {
    setEditValue(entity.name);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== entity.name) {
      if (type === "collection") {
        updateCollection(entityId, { name: trimmed });
      } else {
        renameFolder(entityId, trimmed);
      }
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple shrink-0">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
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
            className="bg-transparent outline-none border-b border-accent-purple text-sm font-semibold text-text-primary flex-1"
          />
        ) : (
          <span
            className="text-sm font-semibold text-text-primary truncate cursor-pointer hover:text-accent-purple-light transition-colors"
            onClick={startEdit}
          >
            {entity.name}
          </span>
        )}
        <span className="text-xs text-text-muted">
          Documentation
        </span>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <DocsEditor
          value={docs}
          onChange={(value) => updateDocsDraft(tabId, value)}
          placeholder={`Write documentation for this ${type}...\n\nSupports Markdown: headings, bold, code blocks, lists, links...`}
        />
      </div>
    </div>
  );
}
