import { useState, useMemo } from "react";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useCollectionStore } from "@/stores/collection-store";
import type { EntityId } from "@/core/models/primitives";
import type { Environment } from "@/core/models/environment";
import { cn } from "@/lib/cn";
import { Button } from "@/primitives/button";

interface EnvListProps {
  collectionId: EntityId;
  selectedEnvId: EntityId | null;
  onSelect: (id: EntityId) => void;
}

export function EnvList({ collectionId, selectedEnvId, onSelect }: EnvListProps) {
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const createEnvironment = useEnvironmentStore((s) => s.createEnvironment);
  const deleteEnvironment = useEnvironmentStore((s) => s.deleteEnvironment);
  const duplicateEnvironment = useEnvironmentStore((s) => s.duplicateEnvironment);
  const updateEnvironment = useEnvironmentStore((s) => s.updateEnvironment);
  const collections = useCollectionStore((s) => s.collections);
  const setActiveEnvironment = useCollectionStore((s) => s.setActiveEnvironment);

  const environments = useMemo(
    () => allEnvironments.filter((e) => e.collectionId === collectionId),
    [allEnvironments, collectionId],
  );
  const activeEnvId = useMemo(
    () => collections.find((c) => c.id === collectionId)?.activeEnvironmentId ?? null,
    [collections, collectionId],
  );

  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    const env = createEnvironment(collectionId, `Environment ${environments.length + 1}`);
    onSelect(env.id);
  };

  const handleDelete = (env: Environment) => {
    if (activeEnvId === env.id) {
      setActiveEnvironment(collectionId, null);
    }
    deleteEnvironment(env.id);
    if (selectedEnvId === env.id) {
      const remaining = environments.filter((e) => e.id !== env.id);
      if (remaining.length > 0) onSelect(remaining[0].id);
    }
  };

  const handleDuplicate = (id: EntityId) => {
    const dup = duplicateEnvironment(id);
    if (dup) onSelect(dup.id);
  };

  const startRename = (env: Environment) => {
    setEditingId(env.id);
    setEditName(env.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      updateEnvironment(editingId, { name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Environments
        </span>
        <Button variant="ghost" size="sm" onClick={handleCreate}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {environments.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-text-muted">No environments yet</p>
          </div>
        ) : (
          environments.map((env) => (
            <div
              key={env.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-colors",
                selectedEnvId === env.id
                  ? "bg-accent-purple/10 text-text-primary"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
              onClick={() => onSelect(env.id)}
            >
              {activeEnvId === env.id && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" />
              )}

              {editingId === env.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-transparent text-sm outline-none border-b border-accent-purple"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-sm truncate">{env.name}</span>
              )}

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {activeEnvId !== env.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEnvironment(collectionId, env.id);
                    }}
                    className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-accent-green"
                    title="Set active"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEnvironment(collectionId, null);
                    }}
                    className="p-0.5 rounded hover:bg-surface-hover text-accent-green hover:text-text-muted"
                    title="Deactivate"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(env);
                  }}
                  className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary"
                  title="Rename"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(env.id);
                  }}
                  className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary"
                  title="Duplicate"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(env);
                  }}
                  className="p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-status-error"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
