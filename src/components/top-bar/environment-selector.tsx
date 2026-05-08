import { useState, useRef, useEffect, useMemo } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useUIStore } from "@/stores/ui-store";
import type { EntityId } from "@/core/models/primitives";
import { cn } from "@/lib/cn";

interface EnvironmentSelectorProps {
  collectionId: EntityId | null;
}

export function EnvironmentSelector({ collectionId }: EnvironmentSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const collections = useCollectionStore((s) => s.collections);
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const setActiveEnvironment = useCollectionStore((s) => s.setActiveEnvironment);
  const setEnvManagerOpen = useUIStore((s) => s.setEnvManagerOpen);

  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId) ?? null,
    [collections, collectionId],
  );

  const environments = useMemo(
    () => (collectionId ? allEnvironments.filter((e) => e.collectionId === collectionId) : []),
    [allEnvironments, collectionId],
  );

  const activeEnv = useMemo(
    () =>
      collection?.activeEnvironmentId
        ? allEnvironments.find((e) => e.id === collection.activeEnvironmentId)
        : undefined,
    [allEnvironments, collection?.activeEnvironmentId],
  );

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (!collectionId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors",
          activeEnv
            ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
            : "bg-surface-hover/50 text-text-muted border border-border-subtle hover:text-text-secondary",
        )}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className="max-w-[120px] truncate">
          {activeEnv ? activeEnv.name : "No Environment"}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-surface-raised border border-border-default rounded-lg shadow-xl z-50 animate-[scaleIn_150ms_cubic-bezier(0.16,1,0.3,1)] origin-top-right">
          <div className="py-1">
            <button
              onClick={() => {
                if (collectionId) setActiveEnvironment(collectionId, null);
                setDropdownOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs transition-colors",
                !activeEnv
                  ? "text-text-primary bg-surface-hover"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              )}
            >
              No Environment
            </button>

            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => {
                  if (collectionId) setActiveEnvironment(collectionId, env.id);
                  setDropdownOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2",
                  collection?.activeEnvironmentId === env.id
                    ? "text-accent-green bg-accent-green/5"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                )}
              >
                {collection?.activeEnvironmentId === env.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" />
                )}
                <span className="truncate">{env.name}</span>
                <span className="ml-auto text-text-muted">{env.variables.length} vars</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border-subtle py-1">
            <button
              onClick={() => {
                setDropdownOpen(false);
                setEnvManagerOpen(true);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Manage Environments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
