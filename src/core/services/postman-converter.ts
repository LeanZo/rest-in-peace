import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig, AuthConfig, RequestBody } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { EntityId } from "@/core/models/primitives";
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequestDef,
  PostmanAuth,
  PostmanBody,
  PostmanUrl,
} from "@/core/models/postman";
import { isPostmanFolder, isPostmanRequest } from "@/core/models/postman";
import { generateId } from "@/lib/id";

const POSTMAN_SCHEMA_V2_1 = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

export function isPostmanCollection(data: unknown): data is PostmanCollection {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.info !== "object" || obj.info === null) return false;
  const info = obj.info as Record<string, unknown>;
  return (
    typeof info.name === "string" &&
    typeof info.schema === "string" &&
    info.schema.includes("schema.getpostman.com")
  );
}

export function importPostmanCollection(data: PostmanCollection): {
  collection: Collection;
  folders: Map<EntityId, Folder>;
  requests: Map<EntityId, RequestConfig>;
  environments: Environment[];
} {
  const now = new Date().toISOString();
  const collectionId = generateId();
  const newFolders = new Map<EntityId, Folder>();
  const newRequests = new Map<EntityId, RequestConfig>();

  const buildItems = (items: PostmanItem[], parentFolderId: EntityId | null): EntityId[] =>
    items.map((item) => {
      if (isPostmanFolder(item)) {
        const folderId = generateId();
        const childItemIds = buildItems(item.item, folderId);
        newFolders.set(folderId, {
          id: folderId,
          collectionId,
          parentFolderId,
          name: item.name || "Unnamed Folder",
          childItemIds,
          createdAt: now,
          updatedAt: now,
        });
        return folderId;
      }

      if (isPostmanRequest(item)) {
        const requestId = generateId();
        const req = item.request;
        const url = resolvePostmanUrl(req.url);
        const params = extractQueryParams(req.url);

        newRequests.set(requestId, {
          id: requestId,
          collectionId,
          parentFolderId,
          name: item.name || "Unnamed Request",
          method: normalizeMethod(req.method),
          url,
          params: params.map((p) => ({ id: generateId(), ...p })),
          headers: (req.header ?? []).map((h) => ({
            id: generateId(),
            key: h.key,
            value: h.value,
            enabled: !h.disabled,
            description: h.description,
          })),
          body: convertPostmanBody(req.body),
          auth: convertPostmanAuth(req.auth),
          routeParams: {},
          createdAt: now,
          updatedAt: now,
        });
        return requestId;
      }

      return generateId();
    });

  const rootItemIds = buildItems(data.item, null);

  const environments: Environment[] = [];
  if (data.variable && data.variable.length > 0) {
    environments.push({
      id: generateId(),
      collectionId,
      name: "Collection Variables",
      variables: data.variable.map((v) => ({
        id: generateId(),
        name: v.key,
        initialValue: String(v.value ?? ""),
        currentValue: String(v.value ?? ""),
        isSecret: false,
        enabled: !v.disabled,
      })),
      createdAt: now,
      updatedAt: now,
    });
  }

  const collection: Collection = {
    id: collectionId,
    name: data.info.name,
    description: data.info.description,
    rootItemIds,
    activeEnvironmentId: null,
    auth: convertPostmanAuth(data.auth),
    createdAt: now,
    updatedAt: now,
  };

  return { collection, folders: newFolders, requests: newRequests, environments };
}

export function exportToPostman(
  collection: Collection,
  folders: Map<EntityId, Folder>,
  requests: Map<EntityId, RequestConfig>,
  environments: Environment[],
): PostmanCollection {
  const buildItems = (itemIds: EntityId[]): PostmanItem[] => {
    const items: PostmanItem[] = [];
    for (const id of itemIds) {
      const folder = folders.get(id);
      if (folder) {
        items.push({
          name: folder.name,
          item: buildItems(folder.childItemIds),
        });
        continue;
      }

      const request = requests.get(id);
      if (request) {
        items.push({
          name: request.name,
          request: {
            method: request.method,
            url: buildPostmanUrl(request),
            header: request.headers.map((h) => ({
              key: h.key,
              value: h.value,
              disabled: !h.enabled,
              description: h.description,
            })),
            body: buildPostmanBody(request.body),
            auth: buildPostmanAuth(request.auth),
          },
          response: [],
        });
      }
    }
    return items;
  };

  const result: PostmanCollection = {
    info: {
      name: collection.name,
      description: collection.description,
      schema: POSTMAN_SCHEMA_V2_1,
    },
    item: buildItems(collection.rootItemIds),
  };

  if (collection.auth && collection.auth.type !== "none") {
    result.auth = buildPostmanAuth(collection.auth);
  }

  const allVars = environments.flatMap((env) => env.variables);
  if (allVars.length > 0) {
    result.variable = allVars.map((v) => ({
      key: v.name,
      value: v.initialValue,
      disabled: !v.enabled,
    }));
  }

  return result;
}

function resolvePostmanUrl(url: string | PostmanUrl): string {
  if (typeof url === "string") return url;
  return url.raw ?? "";
}

function extractQueryParams(url: string | PostmanUrl): Array<{ key: string; value: string; enabled: boolean }> {
  if (typeof url === "string") return [];
  if (!url.query) return [];
  return url.query.map((q) => ({
    key: q.key,
    value: q.value ?? "",
    enabled: !q.disabled,
  }));
}

function normalizeMethod(method: string): RequestConfig["method"] {
  const upper = method.toUpperCase();
  const valid = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"] as const;
  return (valid.includes(upper as (typeof valid)[number]) ? upper : "GET") as RequestConfig["method"];
}

function convertPostmanBody(body?: PostmanBody): RequestBody {
  if (!body || body.disabled) return { type: "none" };

  switch (body.mode) {
    case "raw": {
      const lang = body.options?.raw?.language;
      if (lang === "json" || (!lang && looksLikeJson(body.raw))) {
        return { type: "json", content: body.raw ?? "" };
      }
      return { type: "raw", content: body.raw ?? "", contentType: mimeForLanguage(lang) };
    }
    case "formdata":
      return {
        type: "formdata",
        fields: (body.formdata ?? []).map((f) => ({
          id: generateId(),
          key: f.key,
          value: f.value ?? "",
          fieldType: f.type === "file" ? "file" : "text",
          filePath: f.src,
          enabled: !f.disabled,
        })),
      };
    case "urlencoded":
      return {
        type: "urlencoded",
        fields: (body.urlencoded ?? []).map((f) => ({
          id: generateId(),
          key: f.key,
          value: f.value ?? "",
          enabled: !f.disabled,
        })),
      };
    case "graphql":
      return {
        type: "graphql",
        query: body.graphql?.query ?? "",
        variables: body.graphql?.variables ?? "",
        operationName: body.graphql?.operationName,
      };
    default:
      return { type: "none" };
  }
}

function convertPostmanAuth(auth?: PostmanAuth): AuthConfig {
  if (!auth || auth.type === "noauth") return { type: "none" };

  switch (auth.type) {
    case "basic": {
      const username = findAuthValue(auth.basic, "username");
      const password = findAuthValue(auth.basic, "password");
      return { type: "basic", username, password };
    }
    case "bearer": {
      const token = findAuthValue(auth.bearer, "token");
      const prefix = findAuthValue(auth.bearer, "prefix");
      return { type: "bearer", token, ...(prefix ? { prefix } : {}) };
    }
    case "apikey": {
      const key = findAuthValue(auth.apikey, "key");
      const value = findAuthValue(auth.apikey, "value");
      const addTo = findAuthValue(auth.apikey, "in");
      return { type: "apikey", key, value, addTo: addTo === "query" ? "query" : "header" };
    }
    default:
      return { type: "none" };
  }
}

function findAuthValue(params: Array<{ key: string; value: unknown }> | undefined, key: string): string {
  const param = params?.find((p) => p.key === key);
  return param ? String(param.value ?? "") : "";
}

function buildPostmanUrl(request: RequestConfig): string | PostmanUrl {
  if (request.params.length === 0) return request.url;

  return {
    raw: request.url,
    query: request.params.map((p) => ({
      key: p.key,
      value: p.value,
      disabled: !p.enabled,
      description: p.description,
    })),
  };
}

function buildPostmanBody(body: RequestBody): PostmanBody | undefined {
  switch (body.type) {
    case "none":
      return undefined;
    case "json":
      return { mode: "raw", raw: body.content, options: { raw: { language: "json" } } };
    case "raw":
      return { mode: "raw", raw: body.content, options: { raw: { language: languageForMime(body.contentType) } } };
    case "formdata":
      return {
        mode: "formdata",
        formdata: body.fields.map((f) => ({
          key: f.key,
          value: f.value,
          type: f.fieldType === "file" ? "file" as const : "text" as const,
          src: f.filePath,
          disabled: !f.enabled,
        })),
      };
    case "urlencoded":
      return {
        mode: "urlencoded",
        urlencoded: body.fields.map((f) => ({
          key: f.key,
          value: f.value,
          disabled: !f.enabled,
        })),
      };
    case "graphql":
      return {
        mode: "graphql",
        graphql: {
          query: body.query,
          variables: body.variables,
          operationName: body.operationName,
        },
      };
  }
}

function buildPostmanAuth(auth: AuthConfig): PostmanAuth | undefined {
  switch (auth.type) {
    case "none":
      return undefined;
    case "basic":
      return {
        type: "basic",
        basic: [
          { key: "username", value: auth.username, type: "string" },
          { key: "password", value: auth.password, type: "string" },
        ],
      };
    case "bearer":
      return {
        type: "bearer",
        bearer: [
          { key: "token", value: auth.token, type: "string" },
          ...(auth.prefix ? [{ key: "prefix", value: auth.prefix, type: "string" }] : []),
        ],
      };
    case "apikey":
      return {
        type: "apikey",
        apikey: [
          { key: "key", value: auth.key, type: "string" },
          { key: "value", value: auth.value, type: "string" },
          { key: "in", value: auth.addTo, type: "string" },
        ],
      };
  }
}

function looksLikeJson(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
}

function mimeForLanguage(lang?: string): string {
  switch (lang) {
    case "xml": return "application/xml";
    case "html": return "text/html";
    case "javascript": return "application/javascript";
    default: return "text/plain";
  }
}

function languageForMime(mime: string): string {
  if (mime.includes("xml")) return "xml";
  if (mime.includes("html")) return "html";
  if (mime.includes("javascript")) return "javascript";
  return "text";
}
