import type { BaseEntity, EntityId, KeyValueEntry } from "./primitives";
import type { AuthConfig } from "./request";

export interface Collection extends BaseEntity {
  name: string;
  description?: string;
  docs?: string;
  rootItemIds: EntityId[];
  activeEnvironmentId: EntityId | null;
  auth?: AuthConfig;
  headers?: KeyValueEntry[];
}

export interface Folder extends BaseEntity {
  collectionId: EntityId;
  parentFolderId: EntityId | null;
  name: string;
  docs?: string;
  childItemIds: EntityId[];
}

export type CollectionItemType = "folder" | "request";

export interface CollectionItemRef {
  type: CollectionItemType;
  id: EntityId;
}
