import { describe, it, expect } from "vitest";
import { importInsomniaExport, exportToInsomnia, isInsomniaExport } from "@/core/services/insomnia-converter";
import type { InsomniaExport } from "@/core/models/insomnia";
import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { EntityId } from "@/core/models/primitives";

function makeInsomniaExport(resources: InsomniaExport["resources"] = []): InsomniaExport {
  return {
    _type: "export",
    __export_format: 4,
    __export_date: "2024-01-01T00:00:00.000Z",
    __export_source: "insomnia.desktop.app:v2024.1.0",
    resources: [
      {
        _id: "wrk_1",
        _type: "workspace",
        parentId: null,
        name: "Test Workspace",
      },
      ...resources,
    ],
  };
}

describe("isInsomniaExport", () => {
  it("detects valid insomnia export", () => {
    expect(isInsomniaExport(makeInsomniaExport())).toBe(true);
  });

  it("rejects non-insomnia data", () => {
    expect(isInsomniaExport({ format: "rest-in-peace" })).toBe(false);
    expect(isInsomniaExport(null)).toBe(false);
    expect(isInsomniaExport({})).toBe(false);
    expect(isInsomniaExport({ _type: "export" })).toBe(false);
  });
});

describe("importInsomniaExport", () => {
  it("imports a simple GET request", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Get Users",
        method: "GET",
        url: "https://api.example.com/users",
        headers: [{ name: "Accept", value: "application/json" }],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);

    expect(result.collection.name).toBe("Test Workspace");
    expect(result.requests.size).toBe(1);
    const req = [...result.requests.values()][0];
    expect(req.name).toBe("Get Users");
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.example.com/users");
    expect(req.headers[0].key).toBe("Accept");
  });

  it("imports a POST request with JSON body", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Create User",
        method: "POST",
        url: "/users",
        body: {
          mimeType: "application/json",
          text: '{"name":"John"}',
        },
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("json");
    if (req.body.type === "json") {
      expect(req.body.content).toBe('{"name":"John"}');
    }
  });

  it("imports form-data body", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Upload",
        method: "POST",
        url: "/upload",
        body: {
          mimeType: "multipart/form-data",
          params: [
            { name: "file", value: "", type: "file", fileName: "/path/to/file" },
            { name: "description", value: "test upload" },
          ],
        },
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("formdata");
    if (req.body.type === "formdata") {
      expect(req.body.fields).toHaveLength(2);
      expect(req.body.fields[0].fieldType).toBe("file");
      expect(req.body.fields[1].fieldType).toBe("text");
    }
  });

  it("imports urlencoded body", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Login",
        method: "POST",
        url: "/login",
        body: {
          mimeType: "application/x-www-form-urlencoded",
          params: [
            { name: "username", value: "admin" },
            { name: "password", value: "secret" },
          ],
        },
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("urlencoded");
    if (req.body.type === "urlencoded") {
      expect(req.body.fields).toHaveLength(2);
      expect(req.body.fields[0].key).toBe("username");
    }
  });

  it("imports graphql body", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Query",
        method: "POST",
        url: "/graphql",
        body: {
          mimeType: "application/graphql",
          text: JSON.stringify({ query: "{ users { id } }", variables: { limit: 10 } }),
        },
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("graphql");
    if (req.body.type === "graphql") {
      expect(req.body.query).toBe("{ users { id } }");
    }
  });

  it("imports request groups as folders", () => {
    const data = makeInsomniaExport([
      {
        _id: "fld_1",
        _type: "request_group",
        parentId: "wrk_1",
        name: "Auth",
        environment: {},
        metaSortKey: 0,
      },
      {
        _id: "req_1",
        _type: "request",
        parentId: "fld_1",
        name: "Login",
        method: "POST",
        url: "/login",
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);

    expect(result.folders.size).toBe(1);
    expect(result.requests.size).toBe(1);

    const folder = [...result.folders.values()][0];
    expect(folder.name).toBe("Auth");
    expect(folder.childItemIds).toHaveLength(1);
    expect(folder.parentFolderId).toBeNull();

    const req = [...result.requests.values()][0];
    expect(req.parentFolderId).toBe(folder.id);
  });

  it("imports nested request groups", () => {
    const data = makeInsomniaExport([
      {
        _id: "fld_1",
        _type: "request_group",
        parentId: "wrk_1",
        name: "API",
        environment: {},
        metaSortKey: 0,
      },
      {
        _id: "fld_2",
        _type: "request_group",
        parentId: "fld_1",
        name: "Users",
        environment: {},
        metaSortKey: 0,
      },
      {
        _id: "req_1",
        _type: "request",
        parentId: "fld_2",
        name: "List Users",
        method: "GET",
        url: "/users",
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);

    expect(result.folders.size).toBe(2);
    const apiFolder = [...result.folders.values()].find((f) => f.name === "API")!;
    const usersFolder = [...result.folders.values()].find((f) => f.name === "Users")!;
    expect(usersFolder.parentFolderId).toBe(apiFolder.id);
  });

  it("imports basic auth", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Protected",
        method: "GET",
        url: "/api",
        headers: [],
        parameters: [],
        authentication: { type: "basic", username: "admin", password: "pass123" },
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.auth.type).toBe("basic");
    if (req.auth.type === "basic") {
      expect(req.auth.username).toBe("admin");
      expect(req.auth.password).toBe("pass123");
    }
  });

  it("imports bearer auth", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Protected",
        method: "GET",
        url: "/api",
        headers: [],
        parameters: [],
        authentication: { type: "bearer", token: "jwt-token", prefix: "Bearer" },
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.auth.type).toBe("bearer");
    if (req.auth.type === "bearer") {
      expect(req.auth.token).toBe("jwt-token");
      expect(req.auth.prefix).toBe("Bearer");
    }
  });

  it("imports environments", () => {
    const data = makeInsomniaExport([
      {
        _id: "env_base",
        _type: "environment",
        parentId: "wrk_1",
        name: "Base Environment",
        data: {},
      },
      {
        _id: "env_prod",
        _type: "environment",
        parentId: "env_base",
        name: "Production",
        data: {
          baseUrl: "https://api.prod.com",
          token: "secret",
        },
      },
    ]);

    const result = importInsomniaExport(data);

    expect(result.environments).toHaveLength(1);
    expect(result.environments[0].name).toBe("Production");
    expect(result.environments[0].variables).toHaveLength(2);
    expect(result.environments[0].variables[0].name).toBe("baseUrl");
    expect(result.environments[0].variables[0].initialValue).toBe("https://api.prod.com");
  });

  it("imports query parameters", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "Search",
        method: "GET",
        url: "https://api.example.com/search",
        headers: [],
        parameters: [
          { name: "q", value: "test" },
          { name: "page", value: "1", disabled: true },
        ],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.params).toHaveLength(2);
    expect(req.params[0].key).toBe("q");
    expect(req.params[0].enabled).toBe(true);
    expect(req.params[1].key).toBe("page");
    expect(req.params[1].enabled).toBe(false);
  });

  it("imports raw text body", () => {
    const data = makeInsomniaExport([
      {
        _id: "req_1",
        _type: "request",
        parentId: "wrk_1",
        name: "XML Request",
        method: "POST",
        url: "/xml",
        body: {
          mimeType: "application/xml",
          text: "<root><item>test</item></root>",
        },
        headers: [],
        parameters: [],
        authentication: {},
      },
    ]);

    const result = importInsomniaExport(data);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("raw");
    if (req.body.type === "raw") {
      expect(req.body.content).toBe("<root><item>test</item></root>");
      expect(req.body.contentType).toBe("application/xml");
    }
  });
});

describe("exportToInsomnia", () => {
  function makeCollection(overrides: Partial<Collection> = {}): Collection {
    return {
      id: "col-1",
      name: "My API",
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
      headers: [],
      body: { type: "none" },
      auth: { type: "none" },
      routeParams: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("exports with correct top-level structure", () => {
    const col = makeCollection();

    const result = exportToInsomnia(col, new Map(), new Map(), []);

    expect(result._type).toBe("export");
    expect(result.__export_format).toBe(4);
    expect(result.__export_source).toBe("rest-in-peace");
    expect(result.resources.length).toBeGreaterThanOrEqual(1);
  });

  it("exports workspace resource", () => {
    const col = makeCollection({ name: "My Workspace" });

    const result = exportToInsomnia(col, new Map(), new Map(), []);
    const workspace = result.resources.find((r) => r._type === "workspace");

    expect(workspace).toBeDefined();
    expect(workspace!.name).toBe("My Workspace");
  });

  it("exports requests", () => {
    const req = makeRequest();
    const col = makeCollection({ rootItemIds: [req.id] });
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportToInsomnia(col, new Map(), requests, []);
    const insomniaReqs = result.resources.filter((r) => r._type === "request");

    expect(insomniaReqs).toHaveLength(1);
    const r = insomniaReqs[0] as { name: string; method: string; url: string };
    expect(r.name).toBe("Get Users");
    expect(r.method).toBe("GET");
    expect(r.url).toBe("https://api.example.com/users");
  });

  it("exports folders as request_groups", () => {
    const req = makeRequest({ id: "req-1", parentFolderId: "fld-1" });
    const folder: Folder = {
      id: "fld-1",
      collectionId: "col-1",
      parentFolderId: null,
      name: "Users",
      childItemIds: ["req-1"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const col = makeCollection({ rootItemIds: ["fld-1"] });

    const result = exportToInsomnia(
      col,
      new Map([["fld-1", folder]]),
      new Map([["req-1", req]]),
      [],
    );

    const groups = result.resources.filter((r) => r._type === "request_group");
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Users");
  });

  it("exports environments", () => {
    const col = makeCollection();
    const env: Environment = {
      id: "env-1",
      collectionId: "col-1",
      name: "Production",
      variables: [
        { id: "v-1", name: "base_url", initialValue: "https://api.prod.com", currentValue: "https://api.prod.com", isSecret: false, enabled: true },
        { id: "v-2", name: "token", initialValue: "abc", currentValue: "abc", isSecret: true, enabled: true },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const result = exportToInsomnia(col, new Map(), new Map(), [env]);

    const envResources = result.resources.filter((r) => r._type === "environment");
    expect(envResources.length).toBeGreaterThanOrEqual(2);

    const prodEnv = envResources.find((e) => e.name === "Production") as { name: string; data: Record<string, string> };
    expect(prodEnv).toBeDefined();
    expect(prodEnv.data.base_url).toBe("https://api.prod.com");
  });

  it("exports JSON body", () => {
    const req = makeRequest({
      body: { type: "json", content: '{"key":"value"}' },
    });
    const col = makeCollection({ rootItemIds: [req.id] });

    const result = exportToInsomnia(col, new Map(), new Map([[req.id, req]]), []);
    const insomniaReq = result.resources.find((r) => r._type === "request") as {
      body: { mimeType: string; text: string };
    };

    expect(insomniaReq.body.mimeType).toBe("application/json");
    expect(insomniaReq.body.text).toBe('{"key":"value"}');
  });

  it("exports bearer auth", () => {
    const req = makeRequest({
      auth: { type: "bearer", token: "mytoken" },
    });
    const col = makeCollection({ rootItemIds: [req.id] });

    const result = exportToInsomnia(col, new Map(), new Map([[req.id, req]]), []);
    const insomniaReq = result.resources.find((r) => r._type === "request") as {
      authentication: { type: string; token: string };
    };

    expect(insomniaReq.authentication.type).toBe("bearer");
    expect(insomniaReq.authentication.token).toBe("mytoken");
  });
});

describe("Insomnia round-trip", () => {
  it("preserves data through export-import cycle", () => {
    const col: Collection = {
      id: "col-1",
      name: "Round Trip",
      rootItemIds: ["fld-1", "req-2"],
      activeEnvironmentId: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const folder: Folder = {
      id: "fld-1",
      collectionId: "col-1",
      parentFolderId: null,
      name: "Group",
      childItemIds: ["req-1"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const req1: RequestConfig = {
      id: "req-1",
      collectionId: "col-1",
      parentFolderId: "fld-1",
      name: "Nested Request",
      method: "POST",
      url: "https://api.example.com/data",
      params: [],
      headers: [{ id: "h-1", key: "Content-Type", value: "application/json", enabled: true }],
      body: { type: "json", content: '{"key":"value"}' },
      auth: { type: "basic", username: "admin", password: "pass" },
      routeParams: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const req2: RequestConfig = {
      id: "req-2",
      collectionId: "col-1",
      parentFolderId: null,
      name: "Root Request",
      method: "GET",
      url: "/health",
      params: [],
      headers: [],
      body: { type: "none" },
      auth: { type: "none" },
      routeParams: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const folders = new Map<EntityId, Folder>([["fld-1", folder]]);
    const requests = new Map<EntityId, RequestConfig>([["req-1", req1], ["req-2", req2]]);

    const exported = exportToInsomnia(col, folders, requests, []);
    const imported = importInsomniaExport(exported);

    expect(imported.collection.name).toBe("Round Trip");
    expect(imported.folders.size).toBe(1);
    expect(imported.requests.size).toBe(2);

    const importedFolder = [...imported.folders.values()][0];
    expect(importedFolder.name).toBe("Group");

    const nestedReq = imported.requests.get(importedFolder.childItemIds[0])!;
    expect(nestedReq.name).toBe("Nested Request");
    expect(nestedReq.method).toBe("POST");
    expect(nestedReq.body.type).toBe("json");
    expect(nestedReq.auth.type).toBe("basic");
  });
});
