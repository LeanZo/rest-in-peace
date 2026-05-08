export type EntityId = string;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

export interface KeyValueEntry {
  id: EntityId;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface BaseEntity {
  id: EntityId;
  createdAt: string;
  updatedAt: string;
}
