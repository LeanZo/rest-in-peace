import type { HttpMethod, KeyValueEntry } from "./primitives";
import type { AuthConfig, RequestBody } from "./request";

export interface ExportedCollection {
  format: "rest-in-peace";
  version: 1;
  exportedAt: string;
  collection: {
    name: string;
    description?: string;
    auth?: AuthConfig;
    headers?: KeyValueEntry[];
  };
  environments: Array<{
    name: string;
    variables: Array<{
      name: string;
      initialValue: string;
      isSecret: boolean;
      enabled: boolean;
    }>;
  }>;
  items: ExportedItem[];
}

export type ExportedItem =
  | {
      type: "folder";
      name: string;
      children: ExportedItem[];
    }
  | {
      type: "request";
      name: string;
      method: HttpMethod;
      url: string;
      params: Array<{
        key: string;
        value: string;
        enabled: boolean;
      }>;
      headers: Array<{
        key: string;
        value: string;
        enabled: boolean;
      }>;
      body: RequestBody;
      auth: AuthConfig;
    };
