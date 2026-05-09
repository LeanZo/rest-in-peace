import { describe, it, expect } from "vitest";
import { importPostmanCollection, exportToPostman, isPostmanCollection } from "@/core/services/postman-converter";
import type { PostmanCollection } from "@/core/models/postman";
import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig } from "@/core/models/request";
import type { Environment } from "@/core/models/environment";
import type { EntityId } from "@/core/models/primitives";

const SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

function makePostmanCollection(overrides: Partial<PostmanCollection> = {}): PostmanCollection {
  return {
    info: { name: "Test", schema: SCHEMA },
    item: [],
    ...overrides,
  };
}

describe("isPostmanCollection", () => {
  it("detects valid postman collection", () => {
    expect(isPostmanCollection(makePostmanCollection())).toBe(true);
  });

  it("rejects non-postman data", () => {
    expect(isPostmanCollection({ format: "rest-in-peace" })).toBe(false);
    expect(isPostmanCollection(null)).toBe(false);
    expect(isPostmanCollection({})).toBe(false);
    expect(isPostmanCollection({ info: { name: "test" } })).toBe(false);
  });
});

describe("importPostmanCollection", () => {
  it("imports a simple GET request", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Get Users",
          request: {
            method: "GET",
            url: "https://api.example.com/users",
            header: [{ key: "Accept", value: "application/json" }],
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);

    expect(result.collection.name).toBe("Test");
    expect(result.requests.size).toBe(1);
    const req = [...result.requests.values()][0];
    expect(req.name).toBe("Get Users");
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://api.example.com/users");
    expect(req.headers[0].key).toBe("Accept");
    expect(req.headers[0].enabled).toBe(true);
  });

  it("imports a POST request with JSON body", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Create User",
          request: {
            method: "POST",
            url: "https://api.example.com/users",
            body: {
              mode: "raw",
              raw: '{"name":"John"}',
              options: { raw: { language: "json" } },
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.method).toBe("POST");
    expect(req.body.type).toBe("json");
    if (req.body.type === "json") {
      expect(req.body.content).toBe('{"name":"John"}');
    }
  });

  it("imports form-data body", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Upload",
          request: {
            method: "POST",
            url: "/upload",
            body: {
              mode: "formdata",
              formdata: [
                { key: "file", type: "file", src: "/path/to/file" },
                { key: "name", value: "test", type: "text" },
              ],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("formdata");
    if (req.body.type === "formdata") {
      expect(req.body.fields).toHaveLength(2);
      expect(req.body.fields[0].fieldType).toBe("file");
      expect(req.body.fields[1].fieldType).toBe("text");
    }
  });

  it("imports urlencoded body", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Login",
          request: {
            method: "POST",
            url: "/login",
            body: {
              mode: "urlencoded",
              urlencoded: [
                { key: "username", value: "admin" },
                { key: "password", value: "secret" },
              ],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("urlencoded");
    if (req.body.type === "urlencoded") {
      expect(req.body.fields).toHaveLength(2);
      expect(req.body.fields[0].key).toBe("username");
    }
  });

  it("imports graphql body", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Query",
          request: {
            method: "POST",
            url: "/graphql",
            body: {
              mode: "graphql",
              graphql: {
                query: "{ users { id name } }",
                variables: '{"limit": 10}',
              },
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.body.type).toBe("graphql");
    if (req.body.type === "graphql") {
      expect(req.body.query).toBe("{ users { id name } }");
      expect(req.body.variables).toBe('{"limit": 10}');
    }
  });

  it("imports nested folders", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Auth",
          item: [
            {
              name: "Login",
              request: { method: "POST", url: "/login" },
              response: [],
            },
            {
              name: "Nested",
              item: [
                {
                  name: "Deep",
                  request: { method: "GET", url: "/deep" },
                  response: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = importPostmanCollection(postman);

    expect(result.folders.size).toBe(2);
    expect(result.requests.size).toBe(2);

    const rootFolder = [...result.folders.values()].find((f) => f.name === "Auth")!;
    expect(rootFolder.childItemIds).toHaveLength(2);
    expect(rootFolder.parentFolderId).toBeNull();

    const nestedFolder = [...result.folders.values()].find((f) => f.name === "Nested")!;
    expect(nestedFolder.parentFolderId).toBe(rootFolder.id);
  });

  it("imports basic auth", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Protected",
          request: {
            method: "GET",
            url: "/api",
            auth: {
              type: "basic",
              basic: [
                { key: "username", value: "admin" },
                { key: "password", value: "pass123" },
              ],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.auth.type).toBe("basic");
    if (req.auth.type === "basic") {
      expect(req.auth.username).toBe("admin");
      expect(req.auth.password).toBe("pass123");
    }
  });

  it("imports bearer auth", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Protected",
          request: {
            method: "GET",
            url: "/api",
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "abc123" }],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.auth.type).toBe("bearer");
    if (req.auth.type === "bearer") {
      expect(req.auth.token).toBe("abc123");
    }
  });

  it("imports apikey auth", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "API Key",
          request: {
            method: "GET",
            url: "/api",
            auth: {
              type: "apikey",
              apikey: [
                { key: "key", value: "X-API-Key" },
                { key: "value", value: "secret" },
                { key: "in", value: "header" },
              ],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.auth.type).toBe("apikey");
    if (req.auth.type === "apikey") {
      expect(req.auth.key).toBe("X-API-Key");
      expect(req.auth.value).toBe("secret");
      expect(req.auth.addTo).toBe("header");
    }
  });

  it("imports URL with query parameters", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "Search",
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/search?q=test&limit=10",
              query: [
                { key: "q", value: "test" },
                { key: "limit", value: "10", disabled: true },
              ],
            },
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.url).toBe("https://api.example.com/search?q=test&limit=10");
    expect(req.params).toHaveLength(2);
    expect(req.params[0].key).toBe("q");
    expect(req.params[0].enabled).toBe(true);
    expect(req.params[1].enabled).toBe(false);
  });

  it("imports collection-level variables as environment", () => {
    const postman = makePostmanCollection({
      variable: [
        { key: "baseUrl", value: "https://api.example.com" },
        { key: "apiKey", value: "secret123" },
      ],
    });

    const result = importPostmanCollection(postman);

    expect(result.environments).toHaveLength(1);
    expect(result.environments[0].name).toBe("Collection Variables");
    expect(result.environments[0].variables).toHaveLength(2);
    expect(result.environments[0].variables[0].name).toBe("baseUrl");
    expect(result.environments[0].variables[0].initialValue).toBe("https://api.example.com");
  });

  it("imports disabled headers", () => {
    const postman = makePostmanCollection({
      item: [
        {
          name: "With Headers",
          request: {
            method: "GET",
            url: "/api",
            header: [
              { key: "Active", value: "yes" },
              { key: "Disabled", value: "no", disabled: true },
            ],
          },
          response: [],
        },
      ],
    });

    const result = importPostmanCollection(postman);
    const req = [...result.requests.values()][0];

    expect(req.headers[0].enabled).toBe(true);
    expect(req.headers[1].enabled).toBe(false);
  });
});

describe("exportToPostman", () => {
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
      headers: [{ id: "h-1", key: "Accept", value: "application/json", enabled: true }],
      body: { type: "none" },
      auth: { type: "none" },
      routeParams: {},
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("exports a collection with requests", () => {
    const req = makeRequest();
    const col = makeCollection({ rootItemIds: [req.id] });
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportToPostman(col, new Map(), requests, []);

    expect(result.info.name).toBe("My API");
    expect(result.info.schema).toContain("schema.getpostman.com");
    expect(result.item).toHaveLength(1);
    expect("request" in result.item[0]).toBe(true);
  });

  it("exports nested folders", () => {
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
    const folders = new Map<EntityId, Folder>([["fld-1", folder]]);
    const requests = new Map<EntityId, RequestConfig>([["req-1", req]]);

    const result = exportToPostman(col, folders, requests, []);

    expect(result.item).toHaveLength(1);
    const fld = result.item[0] as { name: string; item: unknown[] };
    expect(fld.name).toBe("Users");
    expect(fld.item).toHaveLength(1);
  });

  it("exports JSON body correctly", () => {
    const req = makeRequest({
      body: { type: "json", content: '{"name":"test"}' },
    });
    const col = makeCollection({ rootItemIds: [req.id] });
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportToPostman(col, new Map(), requests, []);
    const item = result.item[0] as { request: { body: { mode: string; raw: string; options: { raw: { language: string } } } } };

    expect(item.request.body.mode).toBe("raw");
    expect(item.request.body.raw).toBe('{"name":"test"}');
    expect(item.request.body.options.raw.language).toBe("json");
  });

  it("exports bearer auth", () => {
    const req = makeRequest({
      auth: { type: "bearer", token: "abc123" },
    });
    const col = makeCollection({ rootItemIds: [req.id] });
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportToPostman(col, new Map(), requests, []);
    const item = result.item[0] as { request: { auth: { type: string; bearer: Array<{ key: string; value: unknown }> } } };

    expect(item.request.auth.type).toBe("bearer");
    expect(item.request.auth.bearer.find((p) => p.key === "token")?.value).toBe("abc123");
  });

  it("exports environments as variables", () => {
    const col = makeCollection();
    const env: Environment = {
      id: "env-1",
      collectionId: "col-1",
      name: "Prod",
      variables: [
        { id: "v-1", name: "base_url", initialValue: "https://api.prod.com", currentValue: "https://api.prod.com", isSecret: false, enabled: true },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const result = exportToPostman(col, new Map(), new Map(), [env]);

    expect(result.variable).toHaveLength(1);
    expect(result.variable![0].key).toBe("base_url");
    expect(result.variable![0].value).toBe("https://api.prod.com");
  });

  it("exports query params as URL object", () => {
    const req = makeRequest({
      params: [
        { id: "p-1", key: "page", value: "1", enabled: true },
        { id: "p-2", key: "limit", value: "10", enabled: false },
      ],
    });
    const col = makeCollection({ rootItemIds: [req.id] });
    const requests = new Map<EntityId, RequestConfig>([[req.id, req]]);

    const result = exportToPostman(col, new Map(), requests, []);
    const item = result.item[0] as { request: { url: { raw: string; query: Array<{ key: string; disabled: boolean }> } } };

    expect(typeof item.request.url).toBe("object");
    expect(item.request.url.query).toHaveLength(2);
    expect(item.request.url.query[0].disabled).toBe(false);
    expect(item.request.url.query[1].disabled).toBe(true);
  });
});

describe("Postman round-trip", () => {
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
      auth: { type: "bearer", token: "mytoken" },
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

    const exported = exportToPostman(col, folders, requests, []);
    const imported = importPostmanCollection(exported);

    expect(imported.collection.name).toBe("Round Trip");
    expect(imported.folders.size).toBe(1);
    expect(imported.requests.size).toBe(2);

    const importedFolder = [...imported.folders.values()][0];
    expect(importedFolder.name).toBe("Group");
    expect(importedFolder.childItemIds).toHaveLength(1);

    const nestedReq = imported.requests.get(importedFolder.childItemIds[0])!;
    expect(nestedReq.name).toBe("Nested Request");
    expect(nestedReq.method).toBe("POST");
    expect(nestedReq.body.type).toBe("json");
    expect(nestedReq.auth.type).toBe("bearer");
  });
});
