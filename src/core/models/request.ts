import type { BaseEntity, EntityId, HttpMethod, KeyValueEntry } from "./primitives";

// ---- Body types ----

export interface JsonBody {
  type: "json";
  content: string;
}

export interface RawTextBody {
  type: "raw";
  content: string;
  contentType: string;
}

export interface FormDataField {
  id: EntityId;
  key: string;
  value: string;
  fieldType: "text" | "file";
  filePath?: string;
  enabled: boolean;
}

export interface FormDataBody {
  type: "formdata";
  fields: FormDataField[];
}

export interface UrlEncodedBody {
  type: "urlencoded";
  fields: KeyValueEntry[];
}

export interface GraphQLBody {
  type: "graphql";
  query: string;
  variables: string;
  operationName?: string;
}

export interface NoBody {
  type: "none";
}

export type RequestBody =
  | JsonBody
  | RawTextBody
  | FormDataBody
  | UrlEncodedBody
  | GraphQLBody
  | NoBody;

// ---- Auth types ----

export interface NoAuth {
  type: "none";
}

export interface BasicAuth {
  type: "basic";
  username: string;
  password: string;
}

export interface BearerAuth {
  type: "bearer";
  token: string;
  prefix?: string;
}

export interface ApiKeyAuth {
  type: "apikey";
  key: string;
  value: string;
  addTo: "header" | "query";
}

export type AuthConfig = NoAuth | BasicAuth | BearerAuth | ApiKeyAuth;

// ---- Request entity ----

export interface RequestConfig extends BaseEntity {
  collectionId: EntityId;
  parentFolderId: EntityId | null;
  name: string;
  docs?: string;
  method: HttpMethod;
  url: string;
  params: KeyValueEntry[];
  headers: KeyValueEntry[];
  body: RequestBody;
  auth: AuthConfig;
  routeParams: Record<string, string>;
}

// ---- Resolved request (ready to send) ----

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | FormData | null;
}
