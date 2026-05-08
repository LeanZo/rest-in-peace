import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/primitives/modal";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { EntityId } from "@/core/models/primitives";
import { EnvList } from "./env-list";
import { EnvEditor } from "./env-editor";

interface EnvManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: EntityId | null;
}

export function EnvManager({ isOpen, onClose, collectionId }: EnvManagerProps) {
  const [selectedEnvId, setSelectedEnvId] = useState<EntityId | null>(null);
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const collections = useCollectionStore((s) => s.collections);

  const environments = useMemo(
    () => (collectionId ? allEnvironments.filter((e) => e.collectionId === collectionId) : []),
    [allEnvironments, collectionId],
  );
  const collectionName = useMemo(
    () => collections.find((c) => c.id === collectionId)?.name ?? "Collection",
    [collections, collectionId],
  );

  useEffect(() => {
    if (isOpen && environments.length > 0 && !selectedEnvId) {
      setSelectedEnvId(environments[0].id);
    }
  }, [isOpen, environments, selectedEnvId]);

  useEffect(() => {
    if (!isOpen) setSelectedEnvId(null);
  }, [isOpen]);

  if (!collectionId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Environments — ${collectionName}`} size="xl">
      <div className="flex h-[420px] -m-5 border-t border-border-subtle">
        <div className="w-56 shrink-0 border-r border-border-subtle">
          <EnvList
            collectionId={collectionId}
            selectedEnvId={selectedEnvId}
            onSelect={setSelectedEnvId}
          />
        </div>
        <div className="flex-1 min-w-0">
          {selectedEnvId ? (
            <EnvEditor envId={selectedEnvId} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-text-muted">
                {environments.length === 0
                  ? "Create an environment to get started"
                  : "Select an environment"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
