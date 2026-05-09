import { create } from "zustand";
import type { HistoryEntry, OriginalRequest } from "@/core/models/history";
import type { EntityId, HttpMethod } from "@/core/models/primitives";
import type { ResponseData } from "@/core/models/response";
import type { ResolvedRequest } from "@/core/models/request";
import { generateId } from "@/lib/id";
import { getStorage } from "@/core/adapters/storage";
import { MAX_HISTORY_PER_REQUEST } from "@/lib/constants";

interface HistoryState {
  entries: HistoryEntry[];

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  addEntry: (
    requestId: EntityId,
    collectionId: EntityId,
    resolvedRequest: ResolvedRequest,
    response: ResponseData,
    environmentName: string | null,
    originalRequest?: OriginalRequest,
  ) => HistoryEntry;
  deleteEntry: (id: EntityId) => void;
  clearRequestHistory: (requestId: EntityId) => void;
  clearAllHistory: () => void;

  getEntriesForRequest: (requestId: EntityId) => HistoryEntry[];
  getFilteredEntries: (filters: {
    requestId?: EntityId;
    methods?: HttpMethod[];
    statusRange?: string;
    search?: string;
  }) => HistoryEntry[];
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],

  loadFromStorage: async () => {
    const storage = getStorage();
    const data = await storage.get<HistoryEntry[]>("history");
    if (data) set({ entries: data });
  },

  saveToStorage: async () => {
    const storage = getStorage();
    await storage.set("history", get().entries);
  },

  addEntry: (requestId, collectionId, resolvedRequest, response, environmentName, originalRequest) => {
    const now = new Date().toISOString();
    const entry: HistoryEntry = {
      id: generateId(),
      requestId,
      collectionId,
      timestamp: Date.now(),
      resolvedRequest: {
        method: resolvedRequest.method,
        url: resolvedRequest.url,
        headers: Object.entries(resolvedRequest.headers).map(([key, value]) => ({
          key,
          value,
        })),
        body: typeof resolvedRequest.body === "string" ? resolvedRequest.body : null,
      },
      originalRequest,
      response,
      environmentName,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const requestEntries = s.entries.filter((e) => e.requestId === requestId);
      const otherEntries = s.entries.filter((e) => e.requestId !== requestId);

      const trimmed = [entry, ...requestEntries].slice(
        0,
        MAX_HISTORY_PER_REQUEST,
      );

      return { entries: [...trimmed, ...otherEntries] };
    });
    get().saveToStorage();
    return entry;
  },

  deleteEntry: (id) => {
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    get().saveToStorage();
  },

  clearRequestHistory: (requestId) => {
    set((s) => ({
      entries: s.entries.filter((e) => e.requestId !== requestId),
    }));
    get().saveToStorage();
  },

  clearAllHistory: () => {
    set({ entries: [] });
    get().saveToStorage();
  },

  getEntriesForRequest: (requestId) => {
    return get()
      .entries.filter((e) => e.requestId === requestId)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getFilteredEntries: (filters) => {
    let entries = get().entries;

    if (filters.requestId) {
      entries = entries.filter((e) => e.requestId === filters.requestId);
    }
    if (filters.methods && filters.methods.length > 0) {
      entries = entries.filter((e) =>
        filters.methods!.includes(e.resolvedRequest.method),
      );
    }
    if (filters.statusRange) {
      entries = entries.filter((e) => {
        const code = e.response.statusCode;
        switch (filters.statusRange) {
          case "2xx": return code >= 200 && code < 300;
          case "3xx": return code >= 300 && code < 400;
          case "4xx": return code >= 400 && code < 500;
          case "5xx": return code >= 500;
          default: return true;
        }
      });
    }
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.resolvedRequest.url.toLowerCase().includes(lower) ||
          e.resolvedRequest.method.toLowerCase().includes(lower),
      );
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  },
}));
