import { create } from "zustand";
import type { EntityId } from "@/core/models/primitives";
import type { RequestConfig } from "@/core/models/request";
import { getStorage } from "@/core/adapters/storage";

export type TabType = "request" | "collection" | "folder";

export interface Tab {
  id: string;
  type: TabType;
  entityId: EntityId;
  isDirty: boolean;
}

interface RequestStoreState {
  openTabs: Tab[];
  activeTabId: string | null;
  drafts: Map<string, RequestConfig>;
  docsDrafts: Map<string, string>;

  openRequest: (requestId: EntityId, request: RequestConfig) => void;
  openCollection: (collectionId: EntityId, docs: string) => void;
  openFolder: (folderId: EntityId, docs: string) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  closeTabsForEntities: (entityIds: EntityId[]) => void;
  setActiveTab: (tabId: string) => void;
  updateDraft: (tabId: string, patch: Partial<RequestConfig>) => void;
  updateDocsDraft: (tabId: string, docs: string) => void;
  getDocsDraft: (tabId: string) => string | undefined;
  saveDocsDraft: (tabId: string) => void;
  getDraft: (tabId: string) => RequestConfig | undefined;
  getActiveTab: () => Tab | undefined;
  getActiveDraft: () => RequestConfig | undefined;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  syncRequestName: (requestId: EntityId, name: string) => void;
  markClean: (tabId: string) => void;
  saveTabState: () => void;
  loadTabState: (requests: Map<EntityId, RequestConfig>) => Promise<void>;
}

export const useRequestStore = create<RequestStoreState>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  drafts: new Map(),
  docsDrafts: new Map(),

  openRequest: (requestId, request) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.type === "request" && t.entityId === requestId);

    if (existing) {
      set({ activeTabId: existing.id });
      get().saveTabState();
      return;
    }

    const tabId = crypto.randomUUID();
    const tab: Tab = { id: tabId, type: "request", entityId: requestId, isDirty: false };

    set((s) => {
      const newDrafts = new Map(s.drafts);
      newDrafts.set(tabId, structuredClone(request));
      return {
        openTabs: [...s.openTabs, tab],
        activeTabId: tabId,
        drafts: newDrafts,
      };
    });
    get().saveTabState();
  },

  openCollection: (collectionId, docs) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.type === "collection" && t.entityId === collectionId);

    if (existing) {
      set({ activeTabId: existing.id });
      get().saveTabState();
      return;
    }

    const tabId = crypto.randomUUID();
    const tab: Tab = { id: tabId, type: "collection", entityId: collectionId, isDirty: false };

    set((s) => {
      const newDocsDrafts = new Map(s.docsDrafts);
      newDocsDrafts.set(tabId, docs);
      return {
        openTabs: [...s.openTabs, tab],
        activeTabId: tabId,
        docsDrafts: newDocsDrafts,
      };
    });
    get().saveTabState();
  },

  openFolder: (folderId, docs) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.type === "folder" && t.entityId === folderId);

    if (existing) {
      set({ activeTabId: existing.id });
      get().saveTabState();
      return;
    }

    const tabId = crypto.randomUUID();
    const tab: Tab = { id: tabId, type: "folder", entityId: folderId, isDirty: false };

    set((s) => {
      const newDocsDrafts = new Map(s.docsDrafts);
      newDocsDrafts.set(tabId, docs);
      return {
        openTabs: [...s.openTabs, tab],
        activeTabId: tabId,
        docsDrafts: newDocsDrafts,
      };
    });
    get().saveTabState();
  },

  closeTab: (tabId) => {
    set((s) => {
      const newTabs = s.openTabs.filter((t) => t.id !== tabId);
      const newDrafts = new Map(s.drafts);
      newDrafts.delete(tabId);
      const newDocsDrafts = new Map(s.docsDrafts);
      newDocsDrafts.delete(tabId);

      let newActiveTabId = s.activeTabId;
      if (s.activeTabId === tabId) {
        const closedIndex = s.openTabs.findIndex((t) => t.id === tabId);
        newActiveTabId =
          newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id ?? null;
      }

      return {
        openTabs: newTabs,
        activeTabId: newActiveTabId,
        drafts: newDrafts,
        docsDrafts: newDocsDrafts,
      };
    });
    get().saveTabState();
  },

  closeOtherTabs: (tabId) => {
    set((s) => {
      const kept = s.openTabs.filter((t) => t.id === tabId);
      const newDrafts = new Map<string, RequestConfig>();
      const newDocsDrafts = new Map<string, string>();
      for (const tab of kept) {
        const draft = s.drafts.get(tab.id);
        if (draft) newDrafts.set(tab.id, draft);
        const docsDraft = s.docsDrafts.get(tab.id);
        if (docsDraft !== undefined) newDocsDrafts.set(tab.id, docsDraft);
      }
      return { openTabs: kept, activeTabId: tabId, drafts: newDrafts, docsDrafts: newDocsDrafts };
    });
    get().saveTabState();
  },

  closeAllTabs: () => {
    set({ openTabs: [], activeTabId: null, drafts: new Map(), docsDrafts: new Map() });
    get().saveTabState();
  },

  closeTabsForEntities: (entityIds) => {
    const idSet = new Set(entityIds);
    set((s) => {
      const closing = s.openTabs.filter((t) => idSet.has(t.entityId));
      if (closing.length === 0) return s;

      const newTabs = s.openTabs.filter((t) => !idSet.has(t.entityId));
      const newDrafts = new Map(s.drafts);
      const newDocsDrafts = new Map(s.docsDrafts);
      for (const tab of closing) {
        newDrafts.delete(tab.id);
        newDocsDrafts.delete(tab.id);
      }

      let newActiveTabId = s.activeTabId;
      if (s.activeTabId && closing.some((t) => t.id === s.activeTabId)) {
        newActiveTabId = newTabs[0]?.id ?? null;
      }

      return { openTabs: newTabs, activeTabId: newActiveTabId, drafts: newDrafts, docsDrafts: newDocsDrafts };
    });
    get().saveTabState();
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    get().saveTabState();
  },

  updateDraft: (tabId, patch) => {
    set((s) => {
      const draft = s.drafts.get(tabId);
      if (!draft) return s;

      const newDrafts = new Map(s.drafts);
      newDrafts.set(tabId, { ...draft, ...patch, id: draft.id });

      const newTabs = s.openTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: true } : t,
      );

      return { drafts: newDrafts, openTabs: newTabs };
    });
  },

  updateDocsDraft: (tabId, docs) => {
    set((s) => {
      if (s.docsDrafts.get(tabId) === docs) return s;
      const newDocsDrafts = new Map(s.docsDrafts);
      newDocsDrafts.set(tabId, docs);
      const newTabs = s.openTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: true } : t,
      );
      return { docsDrafts: newDocsDrafts, openTabs: newTabs };
    });
  },

  getDocsDraft: (tabId) => get().docsDrafts.get(tabId),

  saveDocsDraft: (tabId) => {
    const { openTabs, docsDrafts } = get();
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab || (tab.type !== "collection" && tab.type !== "folder")) return;

    const docs = docsDrafts.get(tabId);
    if (docs === undefined) return;

    import("@/stores/collection-store").then(({ useCollectionStore }) => {
      if (tab.type === "collection") {
        useCollectionStore.getState().updateCollectionDocs(tab.entityId, docs);
      } else {
        useCollectionStore.getState().updateFolderDocs(tab.entityId, docs);
      }
    });

    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t,
      ),
    }));
  },

  getDraft: (tabId) => get().drafts.get(tabId),

  getActiveTab: () => {
    const { openTabs, activeTabId } = get();
    return openTabs.find((t) => t.id === activeTabId);
  },

  getActiveDraft: () => {
    const { drafts, activeTabId } = get();
    if (!activeTabId) return undefined;
    return drafts.get(activeTabId);
  },

  reorderTab: (fromIndex, toIndex) => {
    set((s) => {
      const tabs = [...s.openTabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { openTabs: tabs };
    });
    get().saveTabState();
  },

  syncRequestName: (requestId, name) => {
    set((s) => {
      const tab = s.openTabs.find((t) => t.type === "request" && t.entityId === requestId);
      if (!tab) return s;
      const draft = s.drafts.get(tab.id);
      if (!draft) return s;
      const newDrafts = new Map(s.drafts);
      newDrafts.set(tab.id, { ...draft, name });
      return { drafts: newDrafts };
    });
  },

  markClean: (tabId) => {
    set((s) => ({
      openTabs: s.openTabs.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t,
      ),
    }));
  },

  saveTabState: () => {
    const { openTabs, activeTabId } = get();
    const storage = getStorage();
    storage.set("tab-state", {
      tabs: openTabs.map((t) => ({ id: t.id, type: t.type, entityId: t.entityId })),
      activeTabId,
    });
  },

  loadTabState: async (requests) => {
    const storage = getStorage();
    const data = await storage.get<{
      tabs: Array<{ id: string; type?: TabType; entityId?: EntityId; requestId?: EntityId }>;
      activeTabId: string | null;
    }>("tab-state");
    if (!data) return;

    const { useCollectionStore } = await import("@/stores/collection-store");
    const { collections, folders } = useCollectionStore.getState();

    const validTabs: Tab[] = [];
    const newDrafts = new Map<string, RequestConfig>();
    const newDocsDrafts = new Map<string, string>();

    for (const tab of data.tabs) {
      const type = tab.type ?? "request";
      const entityId = tab.entityId ?? tab.requestId;
      if (!entityId) continue;

      if (type === "request") {
        const request = requests.get(entityId);
        if (request) {
          newDrafts.set(tab.id, structuredClone(request));
          validTabs.push({ id: tab.id, type: "request", entityId, isDirty: false });
        }
      } else if (type === "collection") {
        const col = collections.find((c) => c.id === entityId);
        if (col) {
          newDocsDrafts.set(tab.id, col.docs ?? "");
          validTabs.push({ id: tab.id, type: "collection", entityId, isDirty: false });
        }
      } else if (type === "folder") {
        const folder = folders.get(entityId);
        if (folder) {
          newDocsDrafts.set(tab.id, folder.docs ?? "");
          validTabs.push({ id: tab.id, type: "folder", entityId, isDirty: false });
        }
      }
    }

    const activeTabId = validTabs.find((t) => t.id === data.activeTabId)
      ? data.activeTabId
      : (validTabs[0]?.id ?? null);

    set({ openTabs: validTabs, activeTabId, drafts: newDrafts, docsDrafts: newDocsDrafts });
  },
}));
