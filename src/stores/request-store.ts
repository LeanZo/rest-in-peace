import { create } from "zustand";
import type { EntityId } from "@/core/models/primitives";
import type { RequestConfig } from "@/core/models/request";
import { getStorage } from "@/core/adapters/storage";

interface RequestTab {
  id: string;
  requestId: EntityId;
  isDirty: boolean;
}

interface RequestStoreState {
  openTabs: RequestTab[];
  activeTabId: string | null;
  drafts: Map<string, RequestConfig>;

  openRequest: (requestId: EntityId, request: RequestConfig) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  closeTabsForRequests: (requestIds: EntityId[]) => void;
  setActiveTab: (tabId: string) => void;
  updateDraft: (tabId: string, patch: Partial<RequestConfig>) => void;
  getDraft: (tabId: string) => RequestConfig | undefined;
  getActiveTab: () => RequestTab | undefined;
  getActiveDraft: () => RequestConfig | undefined;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  syncRequestName: (requestId: EntityId, name: string) => void;
  saveTabState: () => void;
  loadTabState: (requests: Map<EntityId, RequestConfig>) => Promise<void>;
}

export const useRequestStore = create<RequestStoreState>((set, get) => ({
  openTabs: [],
  activeTabId: null,
  drafts: new Map(),

  openRequest: (requestId, request) => {
    const { openTabs } = get();
    const existing = openTabs.find((t) => t.requestId === requestId);

    if (existing) {
      set({ activeTabId: existing.id });
      get().saveTabState();
      return;
    }

    const tabId = crypto.randomUUID();
    const tab: RequestTab = { id: tabId, requestId, isDirty: false };

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

  closeTab: (tabId) => {
    set((s) => {
      const newTabs = s.openTabs.filter((t) => t.id !== tabId);
      const newDrafts = new Map(s.drafts);
      newDrafts.delete(tabId);

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
      };
    });
    get().saveTabState();
  },

  closeOtherTabs: (tabId) => {
    set((s) => {
      const kept = s.openTabs.filter((t) => t.id === tabId);
      const newDrafts = new Map<string, RequestConfig>();
      for (const tab of kept) {
        const draft = s.drafts.get(tab.id);
        if (draft) newDrafts.set(tab.id, draft);
      }
      return { openTabs: kept, activeTabId: tabId, drafts: newDrafts };
    });
    get().saveTabState();
  },

  closeAllTabs: () => {
    set({ openTabs: [], activeTabId: null, drafts: new Map() });
    get().saveTabState();
  },

  closeTabsForRequests: (requestIds) => {
    const idSet = new Set(requestIds);
    set((s) => {
      const closing = s.openTabs.filter((t) => idSet.has(t.requestId));
      if (closing.length === 0) return s;

      const newTabs = s.openTabs.filter((t) => !idSet.has(t.requestId));
      const newDrafts = new Map(s.drafts);
      for (const tab of closing) newDrafts.delete(tab.id);

      let newActiveTabId = s.activeTabId;
      if (s.activeTabId && closing.some((t) => t.id === s.activeTabId)) {
        newActiveTabId = newTabs[0]?.id ?? null;
      }

      return { openTabs: newTabs, activeTabId: newActiveTabId, drafts: newDrafts };
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
      const tab = s.openTabs.find((t) => t.requestId === requestId);
      if (!tab) return s;
      const draft = s.drafts.get(tab.id);
      if (!draft) return s;
      const newDrafts = new Map(s.drafts);
      newDrafts.set(tab.id, { ...draft, name });
      return { drafts: newDrafts };
    });
  },

  saveTabState: () => {
    const { openTabs, activeTabId } = get();
    const storage = getStorage();
    storage.set("tab-state", {
      tabs: openTabs.map((t) => ({ id: t.id, requestId: t.requestId })),
      activeTabId,
    });
  },

  loadTabState: async (requests) => {
    const storage = getStorage();
    const data = await storage.get<{
      tabs: Array<{ id: string; requestId: EntityId }>;
      activeTabId: string | null;
    }>("tab-state");
    if (!data) return;

    const validTabs = data.tabs.filter((t) => requests.has(t.requestId));
    const newDrafts = new Map<string, RequestConfig>();
    const newTabs: RequestTab[] = [];

    for (const tab of validTabs) {
      const request = requests.get(tab.requestId);
      if (request) {
        newDrafts.set(tab.id, structuredClone(request));
        newTabs.push({ id: tab.id, requestId: tab.requestId, isDirty: false });
      }
    }

    const activeTabId = newTabs.find((t) => t.id === data.activeTabId)
      ? data.activeTabId
      : (newTabs[0]?.id ?? null);

    set({ openTabs: newTabs, activeTabId, drafts: newDrafts });
  },
}));
