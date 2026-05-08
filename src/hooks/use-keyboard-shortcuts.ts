import { useEffect } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { useRequestStore } from "@/stores/request-store";
import { useUIStore } from "@/stores/ui-store";

interface ShortcutHandlers {
  onSend?: () => void;
}

export function useKeyboardShortcuts({ onSend }: ShortcutHandlers = {}) {
  const collections = useCollectionStore((s) => s.collections);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const updateRequest = useCollectionStore((s) => s.updateRequest);
  const openRequest = useRequestStore((s) => s.openRequest);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setEnvManagerOpen = useUIStore((s) => s.setEnvManagerOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "Enter") {
        e.preventDefault();
        onSend?.();
        return;
      }

      if (mod && e.key === "s") {
        e.preventDefault();
        const { activeTabId, drafts, openTabs } = useRequestStore.getState();
        if (!activeTabId) return;
        const draft = drafts.get(activeTabId);
        if (!draft) return;
        updateRequest(draft.id, draft);
        const tab = openTabs.find((t) => t.id === activeTabId);
        if (tab?.isDirty) {
          useRequestStore.setState((s) => ({
            openTabs: s.openTabs.map((t) =>
              t.id === activeTabId ? { ...t, isDirty: false } : t,
            ),
          }));
        }
        return;
      }

      if (mod && e.key === "n") {
        e.preventDefault();
        if (collections.length > 0) {
          const request = addRequest(collections[0].id);
          openRequest(request.id, request);
        }
        return;
      }

      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (mod && e.key === "e") {
        e.preventDefault();
        setEnvManagerOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSend, collections, addRequest, updateRequest, openRequest, toggleSidebar, setEnvManagerOpen]);
}
