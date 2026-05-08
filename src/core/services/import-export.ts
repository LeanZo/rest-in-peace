import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { ExportedCollection, ExportedItem } from "@/core/models/export";
import type { EntityId } from "@/core/models/primitives";
import { generateId } from "@/lib/id";

export function exportCollection(
  collection: Collection,
  folders: Map<EntityId, Folder>,
  requests: Map<EntityId, RequestConfig>,
  environments: Environment[],
): ExportedCollection {
  const buildItems = (itemIds: EntityId[]): ExportedItem[] => {
    const items: ExportedItem[] = [];
    for (const id of itemIds) {
      const folder = folders.get(id);
      if (folder) {
        items.push({
          type: "folder",
          name: folder.name,
          children: buildItems(folder.childItemIds),
        });
        continue;
      }

      const request = requests.get(id);
      if (request) {
        items.push({
          type: "request",
          name: request.name,
          method: request.method,
          url: request.url,
          params: request.params.map((p) => ({
            key: p.key,
            value: p.value,
            enabled: p.enabled,
          })),
          headers: request.headers.map((h) => ({
            key: h.key,
            value: h.value,
            enabled: h.enabled,
          })),
          body: request.body,
          auth: request.auth,
        });
      }
    }
    return items;
  };

  return {
    format: "rest-in-peace",
    version: 1,
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      description: collection.description,
      auth: collection.auth,
      headers: collection.headers,
    },
    environments: environments.map((env) => ({
      name: env.name,
      variables: env.variables.map((v) => ({
        name: v.name,
        initialValue: v.initialValue,
        isSecret: v.isSecret,
        enabled: v.enabled,
      })),
    })),
    items: buildItems(collection.rootItemIds),
  };
}

export function importCollection(data: ExportedCollection): {
  collection: Collection;
  folders: Map<EntityId, Folder>;
  requests: Map<EntityId, RequestConfig>;
  environments: Environment[];
} {
  if (data.format !== "rest-in-peace" || data.version !== 1) {
    throw new Error("Unsupported collection format");
  }

  const now = new Date().toISOString();
  const collectionId = generateId();

  const newFolders = new Map<EntityId, Folder>();
  const newRequests = new Map<EntityId, RequestConfig>();

  const buildItems = (items: ExportedItem[], parentFolderId: EntityId | null): EntityId[] =>
    items.map((item) => {
      if (item.type === "folder") {
        const folderId = generateId();
        const childItemIds = buildItems(item.children, folderId);
        newFolders.set(folderId, {
          id: folderId,
          collectionId,
          parentFolderId,
          name: item.name,
          childItemIds,
          createdAt: now,
          updatedAt: now,
        });
        return folderId;
      }

      const requestId = generateId();
      newRequests.set(requestId, {
        id: requestId,
        collectionId,
        parentFolderId,
        name: item.name,
        method: item.method,
        url: item.url,
        params: item.params.map((p) => ({ id: generateId(), ...p })),
        headers: item.headers.map((h) => ({ id: generateId(), ...h })),
        body: item.body,
        auth: item.auth,
        routeParams: {},
        createdAt: now,
        updatedAt: now,
      });
      return requestId;
    });

  const rootItemIds = buildItems(data.items, null);

  const collection: Collection = {
    id: collectionId,
    name: data.collection.name,
    description: data.collection.description,
    rootItemIds,
    activeEnvironmentId: null,
    auth: data.collection.auth,
    headers: data.collection.headers,
    createdAt: now,
    updatedAt: now,
  };

  const environments: Environment[] = data.environments.map((env) => ({
    id: generateId(),
    collectionId,
    name: env.name,
    variables: env.variables.map((v) => ({
      id: generateId(),
      name: v.name,
      initialValue: v.initialValue,
      currentValue: v.initialValue,
      isSecret: v.isSecret,
      enabled: v.enabled,
    })),
    createdAt: now,
    updatedAt: now,
  }));

  return { collection, folders: newFolders, requests: newRequests, environments };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
