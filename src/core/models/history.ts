import type { BaseEntity, EntityId, HttpMethod } from "./primitives";
import type { ResponseData } from "./response";

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
  response: ResponseData;
  environmentName: string | null;
}
