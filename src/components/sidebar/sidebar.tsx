import { useState, useRef, useMemo, type DragEvent } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useRequestStore } from "@/stores/request-store";
import { exportCollection, importCollection, downloadJson, readJsonFile } from "@/core/services/import-export";
import type { ExportedCollection } from "@/core/models/export";
import { MethodBadge } from "@/primitives/badge";
import { Button } from "@/primitives/button";
import { cn } from "@/lib/cn";
import type { EntityId } from "@/core/models/primitives";
import type { RequestConfig } from "@/core/models/request";

export function Sidebar() {
  const collections = useCollectionStore((s) => s.collections);
  const folders = useCollectionStore((s) => s.folders);
  const requests = useCollectionStore((s) => s.requests);
  const addCollection = useCollectionStore((s) => s.addCollection);
  const importCollectionData = useCollectionStore((s) => s.importCollectionData);
  const importEnvironments = useEnvironmentStore((s) => s.importEnvironments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJsonFile<ExportedCollection>(file);
      const result = importCollection(data);
      importCollectionData(result.collection, result.folders, result.requests);
      if (result.environments.length > 0) {
        importEnvironments(result.environments);
      }
    } catch {
      // silently fail for invalid files
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle shrink-0">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Collections
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-hover"
            title="Import collection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={() => addCollection("New Collection")}
            className="text-text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-hover"
            title="New collection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-xs text-text-muted mb-3">No collections yet</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addCollection("My Collection")}
            >
              Create Collection
            </Button>
          </div>
        ) : (
          collections.map((collection) => (
            <CollectionNode key={collection.id} collectionId={collection.id} />
          ))
        )}
      </div>
    </div>
  );
}

function InlineEdit({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (name: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const start = () => {
    setEditValue(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn("bg-transparent outline-none border-b border-accent-purple w-full", className)}
      />
    );
  }

  return (
    <span
      className={cn("truncate", className)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        start();
      }}
    >
      {value || "Untitled"}
    </span>
  );
}

function CollectionNode({ collectionId }: { collectionId: EntityId }) {
  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === collectionId),
  );
  const expandedCollections = useCollectionStore((s) => s.expandedCollectionIds);
  const toggleCollection = useCollectionStore((s) => s.toggleCollection);
  const folders = useCollectionStore((s) => s.folders);
  const requests = useCollectionStore((s) => s.requests);
  const addFolder = useCollectionStore((s) => s.addFolder);
  const addReq = useCollectionStore((s) => s.addRequest);
  const openReq = useRequestStore((s) => s.openRequest);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const updateCollection = useCollectionStore((s) => s.updateCollection);
  const moveItem = useCollectionStore((s) => s.moveItem);
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const isExpanded = expandedCollections.has(collectionId);
  const environments = useMemo(
    () => allEnvironments.filter((e) => e.collectionId === collectionId),
    [allEnvironments, collectionId],
  );
  const [dropTarget, setDropTarget] = useState(false);

  if (!collection) return null;

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = exportCollection(collection, folders, requests, environments);
    const safeName = collection.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadJson(data, `${safeName}.json`);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(false);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    moveItem(itemId, collectionId, null, collection.rootItemIds.length);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 mx-1 rounded hover:bg-surface-hover/50 cursor-pointer group",
          dropTarget && "bg-accent-purple/10 ring-1 ring-accent-purple/30",
        )}
        onClick={() => toggleCollection(collectionId)}
        onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={handleDrop}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "text-text-muted transition-transform duration-150 shrink-0",
            isExpanded && "rotate-90",
          )}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple shrink-0">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <InlineEdit
          value={collection.name}
          onCommit={(name) => updateCollection(collectionId, { name })}
          className="text-xs text-text-primary flex-1"
        />
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); addFolder(collectionId, "New Folder"); }}
            className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover"
            title="Add folder"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); const r = addReq(collectionId); openReq(r.id, r); }}
            className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover"
            title="Add request"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleExport}
            className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover"
            title="Export collection"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteCollection(collectionId); }}
            className="text-text-muted hover:text-status-error p-0.5 rounded hover:bg-surface-hover"
            title="Delete collection"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-3">
          <ItemList
            collectionId={collectionId}
            parentFolderId={null}
            itemIds={collection.rootItemIds}
            depth={1}
          />
        </div>
      )}
    </div>
  );
}

function ItemList({
  collectionId,
  parentFolderId,
  itemIds,
  depth,
}: {
  collectionId: EntityId;
  parentFolderId: EntityId | null;
  itemIds: EntityId[];
  depth: number;
}) {
  const folders = useCollectionStore((s) => s.folders);
  const requests = useCollectionStore((s) => s.requests);

  return (
    <div>
      {itemIds.map((id, index) =>
        folders.has(id) ? (
          <FolderNode
            key={id}
            folderId={id}
            collectionId={collectionId}
            parentFolderId={parentFolderId}
            index={index}
            depth={depth}
          />
        ) : requests.get(id) ? (
          <RequestNode
            key={id}
            request={requests.get(id)!}
            collectionId={collectionId}
            parentFolderId={parentFolderId}
            index={index}
            depth={depth}
          />
        ) : null,
      )}
    </div>
  );
}

function FolderNode({
  folderId,
  collectionId,
  parentFolderId,
  index,
  depth,
}: {
  folderId: EntityId;
  collectionId: EntityId;
  parentFolderId: EntityId | null;
  index: number;
  depth: number;
}) {
  const folder = useCollectionStore((s) => s.folders.get(folderId));
  const expandedIds = useCollectionStore((s) => s.expandedFolderIds);
  const toggleFolder = useCollectionStore((s) => s.toggleFolder);
  const addReq = useCollectionStore((s) => s.addRequest);
  const openReq = useRequestStore((s) => s.openRequest);
  const addFolder = useCollectionStore((s) => s.addFolder);
  const renameFolder = useCollectionStore((s) => s.renameFolder);
  const deleteFolder = useCollectionStore((s) => s.deleteFolder);
  const moveItem = useCollectionStore((s) => s.moveItem);
  const [dropPosition, setDropPosition] = useState<"before" | "inside" | "after" | null>(null);

  if (!folder) return null;

  const isExpanded = expandedIds.has(folderId);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", folderId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.25) {
      setDropPosition("before");
    } else if (y > h * 0.75 && (!isExpanded || folder.childItemIds.length === 0)) {
      setDropPosition("after");
    } else {
      setDropPosition("inside");
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId || itemId === folderId) {
      setDropPosition(null);
      return;
    }
    if (dropPosition === "before") {
      moveItem(itemId, collectionId, parentFolderId, index);
    } else if (dropPosition === "after") {
      moveItem(itemId, collectionId, parentFolderId, index + 1);
    } else {
      moveItem(itemId, collectionId, folderId, folder.childItemIds.length);
    }
    setDropPosition(null);
  };

  return (
    <div>
      {dropPosition === "before" && (
        <div className="h-0.5 mx-2 bg-accent-purple rounded" />
      )}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropPosition(null)}
        onDrop={handleDrop}
        className={cn(
          "flex items-center gap-1 px-2 py-1 mx-1 rounded hover:bg-surface-hover/50 cursor-pointer group",
          dropPosition === "inside" && "bg-accent-purple/10 ring-1 ring-accent-purple/30",
        )}
        style={{ paddingLeft: `${depth * 8 + 8}px` }}
        onClick={() => toggleFolder(folderId)}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "text-text-muted transition-transform duration-150 shrink-0",
            isExpanded && "rotate-90",
          )}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <InlineEdit
          value={folder.name}
          onCommit={(name) => renameFolder(folderId, name)}
          className="text-xs text-text-secondary flex-1"
        />
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); addFolder(collectionId, "New Folder", folderId); }}
            className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover"
            title="Add subfolder"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); const r = addReq(collectionId, folderId); openReq(r.id, r); }}
            className="text-text-muted hover:text-text-primary p-0.5 rounded hover:bg-surface-hover"
            title="Add request"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteFolder(folderId); }}
            className="text-text-muted hover:text-status-error p-0.5 rounded hover:bg-surface-hover"
            title="Delete folder"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {dropPosition === "after" && (
        <div className="h-0.5 mx-2 bg-accent-purple rounded" />
      )}

      {isExpanded && (
        <ItemList
          collectionId={collectionId}
          parentFolderId={folderId}
          itemIds={folder.childItemIds}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function RequestNode({
  request,
  collectionId,
  parentFolderId,
  index,
  depth,
}: {
  request: RequestConfig;
  collectionId: EntityId;
  parentFolderId: EntityId | null;
  index: number;
  depth: number;
}) {
  const openRequest = useRequestStore((s) => s.openRequest);
  const updateRequest = useCollectionStore((s) => s.updateRequest);
  const deleteRequest = useCollectionStore((s) => s.deleteRequest);
  const syncRequestName = useRequestStore((s) => s.syncRequestName);
  const moveItem = useCollectionStore((s) => s.moveItem);
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const openTabs = useRequestStore((s) => s.openTabs);
  const isActive = openTabs.some(
    (t) => t.requestId === request.id && t.id === activeTabId,
  );
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", request.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? "before" : "after");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId || itemId === request.id) {
      setDropPosition(null);
      return;
    }
    const targetIdx = dropPosition === "before" ? index : index + 1;
    moveItem(itemId, collectionId, parentFolderId, targetIdx);
    setDropPosition(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDropPosition(null)}
      onDrop={handleDrop}
    >
      {dropPosition === "before" && (
        <div className="h-0.5 mx-2 bg-accent-purple rounded" />
      )}
      <div
        draggable
        onDragStart={handleDragStart}
        className={cn(
          "flex items-center gap-2 px-2 py-1 mx-1 rounded cursor-pointer transition-colors duration-100 group",
          isActive
            ? "bg-accent-purple/10 text-text-primary"
            : "hover:bg-surface-hover/50 text-text-secondary",
        )}
        style={{ paddingLeft: `${depth * 8 + 16}px` }}
        onClick={() => openRequest(request.id, request)}
      >
        <MethodBadge method={request.method} size="sm" />
        <InlineEdit
          value={request.name}
          onCommit={(name) => {
            updateRequest(request.id, { name });
            syncRequestName(request.id, name);
          }}
          className="text-xs flex-1"
        />
        <button
          onClick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-error p-0.5 rounded transition-opacity"
          title="Delete request"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {dropPosition === "after" && (
        <div className="h-0.5 mx-2 bg-accent-purple rounded" />
      )}
    </div>
  );
}
