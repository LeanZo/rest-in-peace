import { create } from "zustand";
import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { EntityId } from "@/core/models/primitives";
import type { Environment } from "@/core/models/environment";
import { generateId } from "@/lib/id";
import { getStorage } from "@/core/adapters/storage";

interface CollectionState {
  collections: Collection[];
  folders: Map<EntityId, Folder>;
  requests: Map<EntityId, RequestConfig>;
  expandedFolderIds: Set<EntityId>;
  expandedCollectionIds: Set<EntityId>;

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  saveExpandedState: () => Promise<void>;
  loadExpandedState: () => Promise<void>;

  addCollection: (name: string) => Collection;
  deleteCollection: (id: EntityId) => void;
  updateCollection: (id: EntityId, patch: Partial<Pick<Collection, "name" | "description">>) => void;

  addFolder: (collectionId: EntityId, name: string, parentFolderId?: EntityId) => Folder;
  deleteFolder: (id: EntityId) => void;
  renameFolder: (id: EntityId, name: string) => void;

  addRequest: (collectionId: EntityId, parentFolderId?: EntityId) => RequestConfig;
  deleteRequest: (id: EntityId) => void;
  updateRequest: (id: EntityId, patch: Partial<RequestConfig>) => void;
  duplicateRequest: (id: EntityId) => RequestConfig | null;

  toggleFolder: (id: EntityId) => void;
  toggleCollection: (id: EntityId) => void;

  setActiveEnvironment: (collectionId: EntityId, envId: EntityId | null) => void;

  moveItem: (
    itemId: EntityId,
    collectionId: EntityId,
    targetParentFolderId: EntityId | null,
    targetIndex: number,
  ) => void;

  importCollectionData: (
    collection: Collection,
    folders: Map<EntityId, Folder>,
    requests: Map<EntityId, RequestConfig>,
  ) => void;

  getCollectionItems: (collectionId: EntityId) => Array<{ type: "folder" | "request"; id: EntityId }>;
  getFolderItems: (folderId: EntityId) => Array<{ type: "folder" | "request"; id: EntityId }>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  folders: new Map(),
  requests: new Map(),
  expandedFolderIds: new Set(),
  expandedCollectionIds: new Set(),

  loadFromStorage: async () => {
    const storage = getStorage();
    const data = await storage.get<{
      collections: Collection[];
      folders: [EntityId, Folder][];
      requests: [EntityId, RequestConfig][];
    }>("collections");

    if (data) {
      set({
        collections: data.collections,
        folders: new Map(data.folders),
        requests: new Map(data.requests),
      });
    }
  },

  saveToStorage: async () => {
    const { collections, folders, requests } = get();
    const storage = getStorage();
    await storage.set("collections", {
      collections,
      folders: [...folders.entries()],
      requests: [...requests.entries()],
    });
  },

  saveExpandedState: async () => {
    const { expandedFolderIds, expandedCollectionIds } = get();
    const storage = getStorage();
    await storage.set("expanded-state", {
      folders: [...expandedFolderIds],
      collections: [...expandedCollectionIds],
    });
  },

  loadExpandedState: async () => {
    const storage = getStorage();
    const data = await storage.get<{
      folders: EntityId[];
      collections: EntityId[];
    }>("expanded-state");
    if (data) {
      set({
        expandedFolderIds: new Set(data.folders),
        expandedCollectionIds: new Set(data.collections),
      });
    }
  },

  addCollection: (name) => {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: generateId(),
      name,
      rootItemIds: [],
      activeEnvironmentId: null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const newExpanded = new Set(s.expandedCollectionIds);
      newExpanded.add(collection.id);
      return { collections: [...s.collections, collection], expandedCollectionIds: newExpanded };
    });
    get().saveToStorage();
    get().saveExpandedState();
    return collection;
  },

  deleteCollection: (id) => {
    set((s) => {
      const collection = s.collections.find((c) => c.id === id);
      if (!collection) return s;

      const newFolders = new Map(s.folders);
      const newRequests = new Map(s.requests);

      const removeItems = (itemIds: EntityId[]) => {
        for (const itemId of itemIds) {
          if (newFolders.has(itemId)) {
            const folder = newFolders.get(itemId)!;
            removeItems(folder.childItemIds);
            newFolders.delete(itemId);
          } else {
            newRequests.delete(itemId);
          }
        }
      };
      removeItems(collection.rootItemIds);

      return {
        collections: s.collections.filter((c) => c.id !== id),
        folders: newFolders,
        requests: newRequests,
      };
    });
    get().saveToStorage();
  },

  updateCollection: (id, patch) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    get().saveToStorage();
  },

  addFolder: (collectionId, name, parentFolderId) => {
    const now = new Date().toISOString();
    const folder: Folder = {
      id: generateId(),
      collectionId,
      parentFolderId: parentFolderId ?? null,
      name,
      childItemIds: [],
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const newFolders = new Map(s.folders);
      newFolders.set(folder.id, folder);

      let collections = s.collections;
      if (parentFolderId) {
        const parent = newFolders.get(parentFolderId);
        if (parent) {
          newFolders.set(parentFolderId, {
            ...parent,
            childItemIds: [...parent.childItemIds, folder.id],
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === collectionId
            ? { ...c, rootItemIds: [...c.rootItemIds, folder.id] }
            : c,
        );
      }

      const newExpanded = new Set(s.expandedFolderIds);
      newExpanded.add(folder.id);
      return { folders: newFolders, collections, expandedFolderIds: newExpanded };
    });
    get().saveToStorage();
    get().saveExpandedState();
    return folder;
  },

  deleteFolder: (id) => {
    set((s) => {
      const folder = s.folders.get(id);
      if (!folder) return s;

      const newFolders = new Map(s.folders);
      const newRequests = new Map(s.requests);

      const removeChildren = (itemIds: EntityId[]) => {
        for (const itemId of itemIds) {
          if (newFolders.has(itemId)) {
            const child = newFolders.get(itemId)!;
            removeChildren(child.childItemIds);
            newFolders.delete(itemId);
          } else {
            newRequests.delete(itemId);
          }
        }
      };
      removeChildren(folder.childItemIds);
      newFolders.delete(id);

      const removeFromParent = (itemIds: EntityId[]) =>
        itemIds.filter((i) => i !== id);

      let collections = s.collections;
      if (folder.parentFolderId) {
        const parent = newFolders.get(folder.parentFolderId);
        if (parent) {
          newFolders.set(folder.parentFolderId, {
            ...parent,
            childItemIds: removeFromParent(parent.childItemIds),
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === folder.collectionId
            ? { ...c, rootItemIds: removeFromParent(c.rootItemIds) }
            : c,
        );
      }

      return { folders: newFolders, requests: newRequests, collections };
    });
    get().saveToStorage();
  },

  renameFolder: (id, name) => {
    set((s) => {
      const folder = s.folders.get(id);
      if (!folder) return s;
      const newFolders = new Map(s.folders);
      newFolders.set(id, { ...folder, name, updatedAt: new Date().toISOString() });
      return { folders: newFolders };
    });
    get().saveToStorage();
  },

  addRequest: (collectionId, parentFolderId) => {
    const now = new Date().toISOString();
    const request: RequestConfig = {
      id: generateId(),
      collectionId,
      parentFolderId: parentFolderId ?? null,
      name: "New Request",
      method: "GET",
      url: "",
      params: [],
      headers: [],
      body: { type: "none" },
      auth: { type: "none" },
      routeParams: {},
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const newRequests = new Map(s.requests);
      newRequests.set(request.id, request);

      let collections = s.collections;
      const newFolders = new Map(s.folders);

      if (parentFolderId) {
        const parent = newFolders.get(parentFolderId);
        if (parent) {
          newFolders.set(parentFolderId, {
            ...parent,
            childItemIds: [...parent.childItemIds, request.id],
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === collectionId
            ? { ...c, rootItemIds: [...c.rootItemIds, request.id] }
            : c,
        );
      }

      return { requests: newRequests, folders: newFolders, collections };
    });
    get().saveToStorage();
    return request;
  },

  deleteRequest: (id) => {
    set((s) => {
      const request = s.requests.get(id);
      if (!request) return s;

      const newRequests = new Map(s.requests);
      newRequests.delete(id);

      const removeFromParent = (ids: EntityId[]) => ids.filter((i) => i !== id);

      let collections = s.collections;
      const newFolders = new Map(s.folders);

      if (request.parentFolderId) {
        const parent = newFolders.get(request.parentFolderId);
        if (parent) {
          newFolders.set(request.parentFolderId, {
            ...parent,
            childItemIds: removeFromParent(parent.childItemIds),
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === request.collectionId
            ? { ...c, rootItemIds: removeFromParent(c.rootItemIds) }
            : c,
        );
      }

      return { requests: newRequests, folders: newFolders, collections };
    });
    get().saveToStorage();
  },

  updateRequest: (id, patch) => {
    set((s) => {
      const request = s.requests.get(id);
      if (!request) return s;

      const newRequests = new Map(s.requests);
      newRequests.set(id, {
        ...request,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      });
      return { requests: newRequests };
    });
    get().saveToStorage();
  },

  duplicateRequest: (id) => {
    const request = get().requests.get(id);
    if (!request) return null;

    const now = new Date().toISOString();
    const newRequest: RequestConfig = {
      ...structuredClone(request),
      id: generateId(),
      name: `${request.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };

    set((s) => {
      const newRequests = new Map(s.requests);
      newRequests.set(newRequest.id, newRequest);

      let collections = s.collections;
      const newFolders = new Map(s.folders);

      if (request.parentFolderId) {
        const parent = newFolders.get(request.parentFolderId);
        if (parent) {
          newFolders.set(request.parentFolderId, {
            ...parent,
            childItemIds: [...parent.childItemIds, newRequest.id],
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === request.collectionId
            ? { ...c, rootItemIds: [...c.rootItemIds, newRequest.id] }
            : c,
        );
      }

      return { requests: newRequests, folders: newFolders, collections };
    });
    get().saveToStorage();
    return newRequest;
  },

  moveItem: (itemId, collectionId, targetParentFolderId, targetIndex) => {
    set((s) => {
      const newFolders = new Map(s.folders);
      const newRequests = new Map(s.requests);
      let collections = s.collections;

      const isFolder = newFolders.has(itemId);
      const item = isFolder ? newFolders.get(itemId)! : newRequests.get(itemId)!;
      if (!item) return s;

      const currentParent = "parentFolderId" in item ? item.parentFolderId : null;
      const sameParent = currentParent === targetParentFolderId;

      let sourceIndex = -1;
      if (sameParent) {
        const currentList = currentParent
          ? (newFolders.get(currentParent)?.childItemIds ?? [])
          : (collections.find((c) => c.id === collectionId)?.rootItemIds ?? []);
        sourceIndex = currentList.indexOf(itemId);
      }

      if (currentParent) {
        const parent = newFolders.get(currentParent);
        if (parent) {
          newFolders.set(currentParent, {
            ...parent,
            childItemIds: parent.childItemIds.filter((id) => id !== itemId),
          });
        }
      } else {
        collections = collections.map((c) =>
          c.id === collectionId
            ? { ...c, rootItemIds: c.rootItemIds.filter((id) => id !== itemId) }
            : c,
        );
      }

      let adjustedIndex = targetIndex;
      if (sameParent && sourceIndex >= 0 && sourceIndex < targetIndex) {
        adjustedIndex--;
      }

      if (targetParentFolderId) {
        const target = newFolders.get(targetParentFolderId);
        if (target) {
          const ids = [...target.childItemIds];
          ids.splice(adjustedIndex, 0, itemId);
          newFolders.set(targetParentFolderId, { ...target, childItemIds: ids });
        }
      } else {
        collections = collections.map((c) => {
          if (c.id !== collectionId) return c;
          const ids = [...c.rootItemIds];
          ids.splice(adjustedIndex, 0, itemId);
          return { ...c, rootItemIds: ids };
        });
      }

      if (isFolder) {
        const folder = newFolders.get(itemId)!;
        newFolders.set(itemId, { ...folder, parentFolderId: targetParentFolderId ?? null });
      } else {
        const request = newRequests.get(itemId)!;
        newRequests.set(itemId, { ...request, parentFolderId: targetParentFolderId ?? null });
      }

      return { collections, folders: newFolders, requests: newRequests };
    });
    get().saveToStorage();
  },

  importCollectionData: (collection, folders, requests) => {
    set((s) => {
      const newFolders = new Map(s.folders);
      for (const [id, folder] of folders) newFolders.set(id, folder);
      const newRequests = new Map(s.requests);
      for (const [id, request] of requests) newRequests.set(id, request);
      return {
        collections: [...s.collections, collection],
        folders: newFolders,
        requests: newRequests,
      };
    });
    get().saveToStorage();
  },

  setActiveEnvironment: (collectionId, envId) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, activeEnvironmentId: envId, updatedAt: new Date().toISOString() }
          : c,
      ),
    }));
    get().saveToStorage();
  },

  toggleFolder: (id) => {
    set((s) => {
      const newSet = new Set(s.expandedFolderIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { expandedFolderIds: newSet };
    });
    get().saveExpandedState();
  },

  toggleCollection: (id) => {
    set((s) => {
      const newSet = new Set(s.expandedCollectionIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { expandedCollectionIds: newSet };
    });
    get().saveExpandedState();
  },

  getCollectionItems: (collectionId) => {
    const { collections, folders, requests } = get();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return [];

    return collection.rootItemIds.map((id) => ({
      type: (folders.has(id) ? "folder" : "request") as "folder" | "request",
      id,
    }));
  },

  getFolderItems: (folderId) => {
    const { folders, requests } = get();
    const folder = folders.get(folderId);
    if (!folder) return [];

    return folder.childItemIds.map((id) => ({
      type: (folders.has(id) ? "folder" : "request") as "folder" | "request",
      id,
    }));
  },
}));
