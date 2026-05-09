import { describe, it, expect } from "vitest";
import { exportCollection, importCollection, detectFormat, importAny } from "@/core/services/import-export";
import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { ExportedCollection } from "@/core/models/export";
import type { EntityId } from "@/core/models/primitives";

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "col-1",
    name: "Test Collection",
    rootItemIds: [],
    activeEnvironmentId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRequest(overrides: Partial<RequestConfig> = {}): RequestConfig {
  return {
    id: "req-1",
    collectionId: "col-1",
    parentFolderId: null,
    name: "Get Users",
    method: "GET",
    url: "https://api.example.com/users",
    params: [],
    headers: [{ id: "h-1", key: "Accept", value: "application/json", enabled: true }],
    body: { type: "none" },
    auth: { type: "none" },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: "folder-1",
    collectionId: "col-1",
    parentFolderId: null,
    name: "Users",
    childItemIds: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("exportCollection", () => {
  it("exports a collection with requests", () => {
    const req = makeRequest();
    const col = makeCollection({ rootItemIds: [req.id] });
    const folders = new Map<EntityId, Folder>();
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportCollection(col, folders, requests, []);

    expect(result.format).toBe("rest-in-peace");
    expect(result.version).toBe(1);
    expect(result.collection.name).toBe("Test Collection");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("request");
  });

  it("exports nested folders and requests", () => {
    const req = makeRequest({ id: "req-1", parentFolderId: "folder-1" });
    const folder = makeFolder({ childItemIds: ["req-1"] });
    const col = makeCollection({ rootItemIds: ["folder-1"] });
    const folders = new Map<EntityId, Folder>([["folder-1", folder]]);
    const requests = new Map<EntityId, RequestConfig>([["req-1", req]]);

    const result = exportCollection(col, folders, requests, []);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("folder");
    if (result.items[0].type === "folder") {
      expect(result.items[0].children).toHaveLength(1);
      expect(result.items[0].children[0].type).toBe("request");
    }
  });

  it("exports environments", () => {
    const col = makeCollection();
    const env: Environment = {
      id: "env-1",
      collectionId: "col-1",
      name: "Production",
      variables: [
        { id: "v-1", name: "BASE_URL", initialValue: "https://api.prod.com", currentValue: "https://api.prod.com", isSecret: false, enabled: true },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const result = exportCollection(col, new Map(), new Map(), [env]);

    expect(result.environments).toHaveLength(1);
    expect(result.environments[0].name).toBe("Production");
    expect(result.environments[0].variables).toHaveLength(1);
    expect(result.environments[0].variables[0].name).toBe("BASE_URL");
  });

  it("skips missing items gracefully", () => {
    const col = makeCollection({ rootItemIds: ["missing-id"] });

    const result = exportCollection(col, new Map(), new Map(), []);

    expect(result.items).toHaveLength(0);
  });
});

describe("importCollection", () => {
  it("imports a valid exported collection", () => {
    const exported: ExportedCollection = {
      format: "rest-in-peace",
      version: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      collection: { name: "Imported" },
      environments: [],
      items: [
        {
          type: "request",
          name: "Get Users",
          method: "GET",
          url: "https://api.example.com/users",
          params: [],
          headers: [{ key: "Accept", value: "application/json", enabled: true }],
          body: { type: "none" },
          auth: { type: "none" },
        },
      ],
    };

    const result = importCollection(exported);

    expect(result.collection.name).toBe("Imported");
    expect(result.collection.rootItemIds).toHaveLength(1);
    expect(result.requests.size).toBe(1);

    const req = [...result.requests.values()][0];
    expect(req.name).toBe("Get Users");
    expect(req.method).toBe("GET");
    expect(req.headers).toHaveLength(1);
    expect(req.headers[0].key).toBe("Accept");
    expect(req.headers[0].id).toBeTruthy();
  });

  it("imports nested folder structure", () => {
    const exported: ExportedCollection = {
      format: "rest-in-peace",
      version: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      collection: { name: "Nested" },
      environments: [],
      items: [
        {
          type: "folder",
          name: "Auth",
          children: [
            {
              type: "request",
              name: "Login",
              method: "POST",
              url: "/login",
              params: [],
              headers: [],
              body: { type: "json", content: '{"user":"test"}' },
              auth: { type: "none" },
            },
          ],
        },
      ],
    };

    const result = importCollection(exported);

    expect(result.collection.rootItemIds).toHaveLength(1);
    expect(result.folders.size).toBe(1);
    expect(result.requests.size).toBe(1);

    const folder = [...result.folders.values()][0];
    expect(folder.name).toBe("Auth");
    expect(folder.childItemIds).toHaveLength(1);

    const req = [...result.requests.values()][0];
    expect(req.parentFolderId).toBe(folder.id);
  });

  it("imports environments with variables", () => {
    const exported: ExportedCollection = {
      format: "rest-in-peace",
      version: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      collection: { name: "With Envs" },
      environments: [
        {
          name: "Dev",
          variables: [
            { name: "URL", initialValue: "http://localhost:3000", isSecret: false, enabled: true },
          ],
        },
      ],
      items: [],
    };

    const result = importCollection(exported);

    expect(result.environments).toHaveLength(1);
    expect(result.environments[0].name).toBe("Dev");
    expect(result.environments[0].variables[0].currentValue).toBe("http://localhost:3000");
  });

  it("generates unique IDs for all imported entities", () => {
    const exported: ExportedCollection = {
      format: "rest-in-peace",
      version: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      collection: { name: "IDs" },
      environments: [],
      items: [
        { type: "request", name: "A", method: "GET", url: "/a", params: [], headers: [], body: { type: "none" }, auth: { type: "none" } },
        { type: "request", name: "B", method: "POST", url: "/b", params: [], headers: [], body: { type: "none" }, auth: { type: "none" } },
      ],
    };

    const result = importCollection(exported);
    const ids = [...result.requests.keys()];

    expect(ids[0]).not.toBe(ids[1]);
    expect(result.collection.id).toBeTruthy();
  });

  it("throws on unsupported format", () => {
    expect(() =>
      importCollection({ format: "postman", version: 1 } as unknown as ExportedCollection),
    ).toThrow("Unsupported collection format");
  });
});

describe("detectFormat", () => {
  it("detects rest-in-peace format", () => {
    expect(detectFormat({ format: "rest-in-peace", version: 1 })).toBe("rest-in-peace");
  });

  it("detects postman format", () => {
    expect(
      detectFormat({
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [],
      }),
    ).toBe("postman");
  });

  it("detects insomnia format", () => {
    expect(
      detectFormat({
        _type: "export",
        __export_format: 4,
        resources: [],
      }),
    ).toBe("insomnia");
  });

  it("returns null for unknown formats", () => {
    expect(detectFormat({})).toBeNull();
    expect(detectFormat(null)).toBeNull();
    expect(detectFormat("string")).toBeNull();
    expect(detectFormat({ unknown: true })).toBeNull();
  });
});

describe("importAny", () => {
  it("auto-imports rest-in-peace format", () => {
    const data: ExportedCollection = {
      format: "rest-in-peace",
      version: 1,
      exportedAt: "2024-01-01T00:00:00.000Z",
      collection: { name: "Auto RIP" },
      environments: [],
      items: [
        { type: "request", name: "Test", method: "GET", url: "/test", params: [], headers: [], body: { type: "none" }, auth: { type: "none" } },
      ],
    };

    const result = importAny(data);
    expect(result.collection.name).toBe("Auto RIP");
    expect(result.requests.size).toBe(1);
  });

  it("auto-imports postman format", () => {
    const data = {
      info: { name: "Auto Postman", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
      item: [
        { name: "Test", request: { method: "GET", url: "/test" }, response: [] },
      ],
    };

    const result = importAny(data);
    expect(result.collection.name).toBe("Auto Postman");
    expect(result.requests.size).toBe(1);
  });

  it("auto-imports insomnia format", () => {
    const data = {
      _type: "export",
      __export_format: 4,
      __export_date: "2024-01-01T00:00:00.000Z",
      __export_source: "insomnia.desktop.app",
      resources: [
        { _id: "wrk_1", _type: "workspace", parentId: null, name: "Auto Insomnia" },
        { _id: "req_1", _type: "request", parentId: "wrk_1", name: "Test", method: "GET", url: "/test", headers: [], parameters: [] },
      ],
    };

    const result = importAny(data);
    expect(result.collection.name).toBe("Auto Insomnia");
    expect(result.requests.size).toBe(1);
  });

  it("throws on unsupported format", () => {
    expect(() => importAny({ unknown: true })).toThrow("Unsupported collection format");
  });
});
