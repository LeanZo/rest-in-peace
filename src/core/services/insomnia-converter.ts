import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig, AuthConfig, RequestBody } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { EntityId } from "@/core/models/primitives";
import type {
  InsomniaExport,
  InsomniaResource,
  InsomniaRequest,
  InsomniaRequestGroup,
  InsomniaEnvironment,
  InsomniaWorkspace,
  InsomniaAuth,
  InsomniaBody,
} from "@/core/models/insomnia";
import { generateId } from "@/lib/id";

const EXPORT_SOURCE = "rest-in-peace";

export function isInsomniaExport(data: unknown): data is InsomniaExport {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj._type === "export" && typeof obj.__export_format === "number" && Array.isArray(obj.resources);
}

export function importInsomniaExport(data: InsomniaExport): {
  collection: Collection;
  folders: Map<EntityId, Folder>;
  requests: Map<EntityId, RequestConfig>;
  environments: Environment[];
} {
  const now = new Date().toISOString();
  const collectionId = generateId();

  const workspace = data.resources.find((r): r is InsomniaWorkspace => r._type === "workspace");
  const workspaceId = workspace?._id ?? "";

  const groups = data.resources.filter((r): r is InsomniaRequestGroup => r._type === "request_group");
  const reqs = data.resources.filter((r): r is InsomniaRequest => r._type === "request");
  const envs = data.resources.filter((r): r is InsomniaEnvironment => r._type === "environment");

  const oldIdToNewId = new Map<string, EntityId>();
  oldIdToNewId.set(workspaceId, collectionId);
  for (const g of groups) oldIdToNewId.set(g._id, generateId());
  for (const r of reqs) oldIdToNewId.set(r._id, generateId());

  const newFolders = new Map<EntityId, Folder>();
  const newRequests = new Map<EntityId, RequestConfig>();

  const sortByMeta = <T extends { metaSortKey?: number }>(items: T[]) =>
    [...items].sort((a, b) => (a.metaSortKey ?? 0) - (b.metaSortKey ?? 0));

  for (const group of sortByMeta(groups)) {
    const folderId = oldIdToNewId.get(group._id)!;
    const resolvedParent = oldIdToNewId.get(group.parentId);
    const parentFolderId = resolvedParent === collectionId ? null : (resolvedParent ?? null);

    const childGroups = sortByMeta(groups.filter((g) => g.parentId === group._id));
    const childReqs = sortByMeta(reqs.filter((r) => r.parentId === group._id));
    const childItemIds = [
      ...childGroups.map((g) => oldIdToNewId.get(g._id)!),
      ...childReqs.map((r) => oldIdToNewId.get(r._id)!),
    ];

    newFolders.set(folderId, {
      id: folderId,
      collectionId,
      parentFolderId,
      name: group.name || "Unnamed Folder",
      childItemIds,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const req of reqs) {
    const requestId = oldIdToNewId.get(req._id)!;
    const resolvedParent = oldIdToNewId.get(req.parentId);
    const parentFolderId = resolvedParent === collectionId ? null : (resolvedParent ?? null);

    newRequests.set(requestId, {
      id: requestId,
      collectionId,
      parentFolderId,
      name: req.name || "Unnamed Request",
      method: normalizeMethod(req.method),
      url: req.url,
      params: (req.parameters ?? []).map((p) => ({
        id: generateId(),
        key: p.name,
        value: p.value,
        enabled: !p.disabled,
        description: p.description,
      })),
      headers: (req.headers ?? []).map((h) => ({
        id: generateId(),
        key: h.name,
        value: h.value,
        enabled: !h.disabled,
        description: h.description,
      })),
      body: convertInsomniaBody(req.body),
      auth: convertInsomniaAuth(req.authentication),
      routeParams: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  const rootGroupIds = sortByMeta(groups.filter((g) => g.parentId === workspaceId))
    .map((g) => oldIdToNewId.get(g._id)!);
  const rootReqIds = sortByMeta(reqs.filter((r) => r.parentId === workspaceId))
    .map((r) => oldIdToNewId.get(r._id)!);
  const rootItemIds = [...rootGroupIds, ...rootReqIds];

  const collection: Collection = {
    id: collectionId,
    name: workspace?.name ?? "Imported Collection",
    description: workspace?.description,
    rootItemIds,
    activeEnvironmentId: null,
    createdAt: now,
    updatedAt: now,
  };

  const baseEnvId = envs.find((e) => e.parentId === workspaceId)?._id;
  const subEnvs = envs.filter((e) => e.parentId === baseEnvId);

  const environments: Environment[] = subEnvs.map((env) => ({
    id: generateId(),
    collectionId,
    name: env.name || "Environment",
    variables: Object.entries(env.data ?? {}).map(([name, value]) => ({
      id: generateId(),
      name,
      initialValue: String(value ?? ""),
      currentValue: String(value ?? ""),
      isSecret: env.isPrivate ?? false,
      enabled: true,
    })),
    createdAt: now,
    updatedAt: now,
  }));

  return { collection, folders: newFolders, requests: newRequests, environments };
}

export function exportToInsomnia(
  collection: Collection,
  folders: Map<EntityId, Folder>,
  requests: Map<EntityId, RequestConfig>,
  environments: Environment[],
): InsomniaExport {
  const workspaceId = `wrk_${collection.id.replace(/-/g, "")}`;
  const resources: InsomniaResource[] = [];
  let sortKey = 0;

  resources.push({
    _id: workspaceId,
    _type: "workspace",
    parentId: null,
    name: collection.name,
    description: collection.description,
    scope: "collection",
    created: Date.now(),
    modified: Date.now(),
  });

  const idMap = new Map<EntityId, string>();

  const mapFolderId = (id: EntityId) => {
    const mapped = `fld_${id.replace(/-/g, "")}`;
    idMap.set(id, mapped);
    return mapped;
  };

  const mapRequestId = (id: EntityId) => {
    const mapped = `req_${id.replace(/-/g, "")}`;
    idMap.set(id, mapped);
    return mapped;
  };

  const resolveParentId = (parentFolderId: EntityId | null): string =>
    parentFolderId ? (idMap.get(parentFolderId) ?? workspaceId) : workspaceId;

  const buildResources = (itemIds: EntityId[], parentFolderId: EntityId | null) => {
    for (const id of itemIds) {
      const folder = folders.get(id);
      if (folder) {
        const folderId = mapFolderId(id);
        resources.push({
          _id: folderId,
          _type: "request_group",
          parentId: resolveParentId(parentFolderId),
          name: folder.name,
          description: "",
          environment: {},
          metaSortKey: sortKey++,
          created: Date.now(),
          modified: Date.now(),
        });
        buildResources(folder.childItemIds, id);
        continue;
      }

      const request = requests.get(id);
      if (request) {
        const reqId = mapRequestId(id);
        resources.push({
          _id: reqId,
          _type: "request",
          parentId: resolveParentId(parentFolderId),
          name: request.name,
          method: request.method,
          url: request.url,
          body: buildInsomniaBody(request.body),
          headers: request.headers.map((h) => ({
            name: h.key,
            value: h.value,
            disabled: !h.enabled,
            description: h.description,
          })),
          parameters: request.params.map((p) => ({
            name: p.key,
            value: p.value,
            disabled: !p.enabled,
            description: p.description,
          })),
          authentication: buildInsomniaAuth(request.auth),
          metaSortKey: sortKey++,
          isPrivate: false,
          settingEncodeUrl: true,
          settingSendCookies: true,
          settingStoreCookies: true,
          created: Date.now(),
          modified: Date.now(),
        });
      }
    }
  };

  buildResources(collection.rootItemIds, null);

  const baseEnvId = `env_base_${collection.id.replace(/-/g, "")}`;
  resources.push({
    _id: baseEnvId,
    _type: "environment",
    parentId: workspaceId,
    name: "Base Environment",
    data: {},
    metaSortKey: 0,
    created: Date.now(),
    modified: Date.now(),
  });

  for (const env of environments) {
    resources.push({
      _id: `env_${env.id.replace(/-/g, "")}`,
      _type: "environment",
      parentId: baseEnvId,
      name: env.name,
      data: Object.fromEntries(
        env.variables.filter((v) => v.enabled).map((v) => [v.name, v.initialValue]),
      ),
      isPrivate: env.variables.some((v) => v.isSecret),
      metaSortKey: sortKey++,
      created: Date.now(),
      modified: Date.now(),
    });
  }

  return {
    _type: "export",
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: EXPORT_SOURCE,
    resources,
  };
}

function normalizeMethod(method: string): RequestConfig["method"] {
  const upper = method.toUpperCase();
  const valid = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"] as const;
  return (valid.includes(upper as (typeof valid)[number]) ? upper : "GET") as RequestConfig["method"];
}

function convertInsomniaBody(body?: InsomniaBody): RequestBody {
  if (!body || !body.mimeType) return { type: "none" };

  switch (body.mimeType) {
    case "application/json":
      return { type: "json", content: body.text ?? "" };
    case "multipart/form-data":
      return {
        type: "formdata",
        fields: (body.params ?? []).map((p) => ({
          id: generateId(),
          key: p.name,
          value: p.value,
          fieldType: (p.type === "file" ? "file" : "text") as "text" | "file",
          filePath: p.fileName,
          enabled: !p.disabled,
        })),
      };
    case "application/x-www-form-urlencoded":
      return {
        type: "urlencoded",
        fields: (body.params ?? []).map((p) => ({
          id: generateId(),
          key: p.name,
          value: p.value,
          enabled: !p.disabled,
        })),
      };
    case "application/graphql":
      return parseGraphqlBody(body.text ?? "");
    default:
      return { type: "raw", content: body.text ?? "", contentType: body.mimeType };
  }
}

function parseGraphqlBody(text: string): RequestBody {
  try {
    const parsed = JSON.parse(text);
    return {
      type: "graphql",
      query: parsed.query ?? "",
      variables: typeof parsed.variables === "string" ? parsed.variables : JSON.stringify(parsed.variables ?? {}),
      operationName: parsed.operationName,
    };
  } catch {
    return { type: "graphql", query: text, variables: "" };
  }
}

function convertInsomniaAuth(auth?: InsomniaAuth): AuthConfig {
  if (!auth || !auth.type) return { type: "none" };

  switch (auth.type) {
    case "basic":
      return { type: "basic", username: auth.username ?? "", password: auth.password ?? "" };
    case "bearer":
      return { type: "bearer", token: auth.token ?? "", ...(auth.prefix ? { prefix: auth.prefix } : {}) };
    case "apikey":
      return {
        type: "apikey",
        key: auth.key ?? "",
        value: auth.value ?? "",
        addTo: auth.addTo === "query" ? "query" : "header",
      };
    default:
      return { type: "none" };
  }
}

function buildInsomniaBody(body: RequestBody): InsomniaBody {
  switch (body.type) {
    case "none":
      return {};
    case "json":
      return { mimeType: "application/json", text: body.content };
    case "raw":
      return { mimeType: body.contentType || "text/plain", text: body.content };
    case "formdata":
      return {
        mimeType: "multipart/form-data",
        params: body.fields.map((f) => ({
          name: f.key,
          value: f.value,
          type: f.fieldType === "file" ? "file" as const : "text" as const,
          fileName: f.filePath,
          disabled: !f.enabled,
        })),
      };
    case "urlencoded":
      return {
        mimeType: "application/x-www-form-urlencoded",
        params: body.fields.map((f) => ({
          name: f.key,
          value: f.value,
          disabled: !f.enabled,
        })),
      };
    case "graphql":
      return {
        mimeType: "application/graphql",
        text: JSON.stringify({
          query: body.query,
          variables: body.variables,
          ...(body.operationName ? { operationName: body.operationName } : {}),
        }),
      };
  }
}

function buildInsomniaAuth(auth: AuthConfig): InsomniaAuth {
  switch (auth.type) {
    case "none":
      return {};
    case "basic":
      return { type: "basic", username: auth.username, password: auth.password };
    case "bearer":
      return { type: "bearer", token: auth.token, prefix: auth.prefix ?? "Bearer" };
    case "apikey":
      return { type: "apikey", key: auth.key, value: auth.value, addTo: auth.addTo };
  }
}
