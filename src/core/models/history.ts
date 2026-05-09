import type { BaseEntity, EntityId, HttpMethod, KeyValueEntry } from "./primitives";
import type { RequestBody, AuthConfig } from "./request";
import type { ResponseData } from "./response";

export interface OriginalRequest {
  method: HttpMethod;
  url: string;
  headers: KeyValueEntry[];
  params: KeyValueEntry[];
  body: RequestBody;
  auth: AuthConfig;
  routeParams: Record<string, string>;
}

export interface HistoryEntry extends BaseEntity {
  requestId: EntityId;
  collectionId: EntityId;
  timestamp: number;
  resolvedRequest: {
    method: HttpMethod;
    url: string;
    headers: Array<{ key: string; value: string }>;
    body: string | null;
  };
  originalRequest?: OriginalRequest;
  response: ResponseData;
  environmentName: string | null;
}
