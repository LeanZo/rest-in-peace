import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { Environment, EnvironmentVariable } from "@/core/models/environment";
import type { HistoryEntry } from "@/core/models/history";
import type { CookieData } from "@/core/models/cookie";
import type { EntityId } from "@/core/models/primitives";
import type { StorageAdapter } from "./storage";

interface CollectionData {
  collections: Collection[];
  folders: [EntityId, Folder][];
  requests: [EntityId, RequestConfig][];
}

export type EntityType =
  | "collection"
  | "folder"
  | "request"
  | "environment"
  | "history";

export interface ResolvedEntity {
  type: EntityType;
  data: Collection | Folder | RequestConfig | Environment | HistoryEntry;
}

export class DataLayer {
  constructor(private storage: StorageAdapter) {}

  async getCollectionData(): Promise<CollectionData> {
    const data = await this.storage.get<CollectionData>("collections");
    return data ?? { collections: [], folders: [], requests: [] };
  }

  async saveCollectionData(data: CollectionData): Promise<void> {
    await this.storage.set("collections", data);
  }

  async getEnvironments(): Promise<Environment[]> {
    return (await this.storage.get<Environment[]>("environments")) ?? [];
  }

  async saveEnvironments(environments: Environment[]): Promise<void> {
    await this.storage.set("environments", environments);
  }

  async getHistory(): Promise<HistoryEntry[]> {
    return (await this.storage.get<HistoryEntry[]>("history")) ?? [];
  }

  async saveHistory(history: HistoryEntry[]): Promise<void> {
    await this.storage.set("history", history);
  }

  async getCookies(): Promise<Map<EntityId, CookieData[]>> {
    const data =
      await this.storage.get<[EntityId, CookieData[]][]>("cookies");
    return data ? new Map(data) : new Map();
  }

  async saveCookies(cookies: Map<EntityId, CookieData[]>): Promise<void> {
    await this.storage.set("cookies", [...cookies.entries()]);
  }

  async getCollections(): Promise<Collection[]> {
    const data = await this.getCollectionData();
    return data.collections;
  }

  async getFolders(): Promise<Map<EntityId, Folder>> {
    const data = await this.getCollectionData();
    return new Map(data.folders);
  }

  async getRequests(): Promise<Map<EntityId, RequestConfig>> {
    const data = await this.getCollectionData();
    return new Map(data.requests);
  }

  async getCollection(id: EntityId): Promise<Collection | null> {
    const collections = await this.getCollections();
    return collections.find((c) => c.id === id) ?? null;
  }

  async getFolder(id: EntityId): Promise<Folder | null> {
    const folders = await this.getFolders();
    return folders.get(id) ?? null;
  }

  async getRequest(id: EntityId): Promise<RequestConfig | null> {
    const requests = await this.getRequests();
    return requests.get(id) ?? null;
  }

  async getEnvironment(id: EntityId): Promise<Environment | null> {
    const environments = await this.getEnvironments();
    return environments.find((e) => e.id === id) ?? null;
  }

  async getHistoryEntry(id: EntityId): Promise<HistoryEntry | null> {
    const history = await this.getHistory();
    return history.find((h) => h.id === id) ?? null;
  }

  async resolveEntity(id: EntityId): Promise<ResolvedEntity | null> {
    const collData = await this.getCollectionData();

    const collection = collData.collections.find((c) => c.id === id);
    if (collection) return { type: "collection", data: collection };

    const folderMap = new Map(collData.folders);
    const folder = folderMap.get(id);
    if (folder) return { type: "folder", data: folder };

    const requestMap = new Map(collData.requests);
    const request = requestMap.get(id);
    if (request) return { type: "request", data: request };

    const environments = await this.getEnvironments();
    const env = environments.find((e) => e.id === id);
    if (env) return { type: "environment", data: env };

    const history = await this.getHistory();
    const entry = history.find((h) => h.id === id);
    if (entry) return { type: "history", data: entry };

    return null;
  }

  async createCollection(
    name: string,
    description?: string,
  ): Promise<Collection> {
    const now = new Date().toISOString();
    const collection: Collection = {
      id: crypto.randomUUID(),
      name,
      description,
      rootItemIds: [],
      activeEnvironmentId: null,
      createdAt: now,
      updatedAt: now,
    };
    const data = await this.getCollectionData();
    data.collections.push(collection);
    await this.saveCollectionData(data);
    return collection;
  }

  async createFolder(
    collectionId: EntityId,
    name: string,
    parentFolderId?: EntityId,
  ): Promise<Folder> {
    const now = new Date().toISOString();
    const folder: Folder = {
      id: crypto.randomUUID(),
      collectionId,
      parentFolderId: parentFolderId ?? null,
      name,
      childItemIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const data = await this.getCollectionData();
    const folders = new Map(data.folders);
    folders.set(folder.id, folder);

    if (parentFolderId) {
      const parent = folders.get(parentFolderId);
      if (parent) {
        folders.set(parentFolderId, {
          ...parent,
          childItemIds: [...parent.childItemIds, folder.id],
        });
      }
    } else {
      data.collections = data.collections.map((c) =>
        c.id === collectionId
          ? { ...c, rootItemIds: [...c.rootItemIds, folder.id] }
          : c,
      );
    }

    data.folders = [...folders.entries()];
    await this.saveCollectionData(data);
    return folder;
  }

  async createRequest(
    collectionId: EntityId,
    name?: string,
    method?: string,
    url?: string,
    parentFolderId?: EntityId,
  ): Promise<RequestConfig> {
    const now = new Date().toISOString();
    const request: RequestConfig = {
      id: crypto.randomUUID(),
      collectionId,
      parentFolderId: parentFolderId ?? null,
      name: name ?? "New Request",
      method: (method as RequestConfig["method"]) ?? "GET",
      url: url ?? "",
      params: [],
      headers: [],
      body: { type: "none" },
      auth: { type: "none" },
      routeParams: {},
      createdAt: now,
      updatedAt: now,
    };

    const data = await this.getCollectionData();
    const requests = new Map(data.requests);
    const folders = new Map(data.folders);
    requests.set(request.id, request);

    if (parentFolderId) {
      const parent = folders.get(parentFolderId);
      if (parent) {
        folders.set(parentFolderId, {
          ...parent,
          childItemIds: [...parent.childItemIds, request.id],
        });
      }
    } else {
      data.collections = data.collections.map((c) =>
        c.id === collectionId
          ? { ...c, rootItemIds: [...c.rootItemIds, request.id] }
          : c,
      );
    }

    data.requests = [...requests.entries()];
    data.folders = [...folders.entries()];
    await this.saveCollectionData(data);
    return request;
  }

  async createEnvironment(
    collectionId: EntityId,
    name: string,
  ): Promise<Environment> {
    const now = new Date().toISOString();
    const env: Environment = {
      id: crypto.randomUUID(),
      collectionId,
      name,
      variables: [],
      createdAt: now,
      updatedAt: now,
    };
    const environments = await this.getEnvironments();
    environments.push(env);
    await this.saveEnvironments(environments);
    return env;
  }

  async updateCollection(
    id: EntityId,
    patch: Partial<Pick<Collection, "name" | "description" | "docs">>,
  ): Promise<Collection | null> {
    const data = await this.getCollectionData();
    const index = data.collections.findIndex((c) => c.id === id);
    if (index === -1) return null;

    data.collections[index] = {
      ...data.collections[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveCollectionData(data);
    return data.collections[index];
  }

  async updateFolder(
    id: EntityId,
    patch: Partial<Pick<Folder, "name" | "docs">>,
  ): Promise<Folder | null> {
    const data = await this.getCollectionData();
    const folders = new Map(data.folders);
    const folder = folders.get(id);
    if (!folder) return null;

    const updated = {
      ...folder,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    folders.set(id, updated);
    data.folders = [...folders.entries()];
    await this.saveCollectionData(data);
    return updated;
  }

  async updateRequest(
    id: EntityId,
    patch: Partial<RequestConfig>,
  ): Promise<RequestConfig | null> {
    const data = await this.getCollectionData();
    const requests = new Map(data.requests);
    const request = requests.get(id);
    if (!request) return null;

    const updated = {
      ...request,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    requests.set(id, updated);
    data.requests = [...requests.entries()];
    await this.saveCollectionData(data);
    return updated;
  }

  async updateEnvironment(
    id: EntityId,
    patch: Partial<Pick<Environment, "name" | "variables">>,
  ): Promise<Environment | null> {
    const environments = await this.getEnvironments();
    const index = environments.findIndex((e) => e.id === id);
    if (index === -1) return null;

    environments[index] = {
      ...environments[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this.saveEnvironments(environments);
    return environments[index];
  }

  async setVariable(
    envId: EntityId,
    name: string,
    value: string,
    isSecret: boolean,
  ): Promise<Environment | null> {
    const environments = await this.getEnvironments();
    const env = environments.find((e) => e.id === envId);
    if (!env) return null;

    const existing = env.variables.find((v) => v.name === name);
    if (existing) {
      existing.initialValue = value;
      existing.currentValue = value;
      existing.isSecret = isSecret;
    } else {
      env.variables.push({
        id: crypto.randomUUID(),
        name,
        initialValue: value,
        currentValue: value,
        isSecret,
        enabled: true,
      });
    }

    env.updatedAt = new Date().toISOString();
    await this.saveEnvironments(environments);
    return env;
  }

  async deleteVariable(
    envId: EntityId,
    varName: string,
  ): Promise<Environment | null> {
    const environments = await this.getEnvironments();
    const env = environments.find((e) => e.id === envId);
    if (!env) return null;

    env.variables = env.variables.filter((v) => v.name !== varName);
    env.updatedAt = new Date().toISOString();
    await this.saveEnvironments(environments);
    return env;
  }

  async deleteCollection(id: EntityId): Promise<boolean> {
    const data = await this.getCollectionData();
    const collection = data.collections.find((c) => c.id === id);
    if (!collection) return false;

    const folders = new Map(data.folders);
    const requests = new Map(data.requests);

    const removeItems = (itemIds: EntityId[]) => {
      for (const itemId of itemIds) {
        if (folders.has(itemId)) {
          const folder = folders.get(itemId)!;
          removeItems(folder.childItemIds);
          folders.delete(itemId);
        } else {
          requests.delete(itemId);
        }
      }
    };
    removeItems(collection.rootItemIds);

    data.collections = data.collections.filter((c) => c.id !== id);
    data.folders = [...folders.entries()];
    data.requests = [...requests.entries()];
    await this.saveCollectionData(data);

    const environments = await this.getEnvironments();
    await this.saveEnvironments(
      environments.filter((e) => e.collectionId !== id),
    );

    const history = await this.getHistory();
    await this.saveHistory(history.filter((h) => h.collectionId !== id));

    const cookies = await this.getCookies();
    cookies.delete(id);
    await this.saveCookies(cookies);

    return true;
  }

  async deleteFolder(id: EntityId): Promise<boolean> {
    const data = await this.getCollectionData();
    const folders = new Map(data.folders);
    const folder = folders.get(id);
    if (!folder) return false;

    const requests = new Map(data.requests);

    const removeChildren = (itemIds: EntityId[]) => {
      for (const itemId of itemIds) {
        if (folders.has(itemId)) {
          const child = folders.get(itemId)!;
          removeChildren(child.childItemIds);
          folders.delete(itemId);
        } else {
          requests.delete(itemId);
        }
      }
    };
    removeChildren(folder.childItemIds);
    folders.delete(id);

    if (folder.parentFolderId) {
      const parent = folders.get(folder.parentFolderId);
      if (parent) {
        folders.set(folder.parentFolderId, {
          ...parent,
          childItemIds: parent.childItemIds.filter((i) => i !== id),
        });
      }
    } else {
      data.collections = data.collections.map((c) =>
        c.id === folder.collectionId
          ? { ...c, rootItemIds: c.rootItemIds.filter((i) => i !== id) }
          : c,
      );
    }

    data.folders = [...folders.entries()];
    data.requests = [...requests.entries()];
    await this.saveCollectionData(data);
    return true;
  }

  async deleteRequest(id: EntityId): Promise<boolean> {
    const data = await this.getCollectionData();
    const requests = new Map(data.requests);
    const request = requests.get(id);
    if (!request) return false;

    requests.delete(id);
    const folders = new Map(data.folders);

    if (request.parentFolderId) {
      const parent = folders.get(request.parentFolderId);
      if (parent) {
        folders.set(request.parentFolderId, {
          ...parent,
          childItemIds: parent.childItemIds.filter((i) => i !== id),
        });
      }
    } else {
      data.collections = data.collections.map((c) =>
        c.id === request.collectionId
          ? { ...c, rootItemIds: c.rootItemIds.filter((i) => i !== id) }
          : c,
      );
    }

    data.requests = [...requests.entries()];
    data.folders = [...folders.entries()];
    await this.saveCollectionData(data);
    return true;
  }

  async deleteEnvironment(id: EntityId): Promise<boolean> {
    const environments = await this.getEnvironments();
    const filtered = environments.filter((e) => e.id !== id);
    if (filtered.length === environments.length) return false;
    await this.saveEnvironments(filtered);
    return true;
  }

  async deleteHistoryEntry(id: EntityId): Promise<boolean> {
    const history = await this.getHistory();
    const filtered = history.filter((h) => h.id !== id);
    if (filtered.length === history.length) return false;
    await this.saveHistory(filtered);
    return true;
  }

  async clearRequestHistory(requestId: EntityId): Promise<void> {
    const history = await this.getHistory();
    await this.saveHistory(history.filter((h) => h.requestId !== requestId));
  }

  async clearAllHistory(): Promise<void> {
    await this.saveHistory([]);
  }

  async clearCookies(collectionId: EntityId): Promise<void> {
    const cookies = await this.getCookies();
    cookies.set(collectionId, []);
    await this.saveCookies(cookies);
  }

  async getEnvironmentsForCollection(
    collectionId: EntityId,
  ): Promise<Environment[]> {
    const environments = await this.getEnvironments();
    return environments.filter((e) => e.collectionId === collectionId);
  }

  async getCookiesForCollection(
    collectionId: EntityId,
  ): Promise<CookieData[]> {
    const cookies = await this.getCookies();
    return cookies.get(collectionId) ?? [];
  }

  async getActiveVariables(
    collectionId: EntityId,
    activeEnvId: EntityId | null,
  ): Promise<EnvironmentVariable[]> {
    if (!activeEnvId) return [];
    const env = await this.getEnvironment(activeEnvId);
    if (!env || env.collectionId !== collectionId) return [];
    return env.variables;
  }

  async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    const history = await this.getHistory();
    const requestEntries = history.filter(
      (e) => e.requestId === entry.requestId,
    );
    const otherEntries = history.filter(
      (e) => e.requestId !== entry.requestId,
    );
    const trimmed = [entry, ...requestEntries].slice(0, 50);
    await this.saveHistory([...trimmed, ...otherEntries]);
  }
}
