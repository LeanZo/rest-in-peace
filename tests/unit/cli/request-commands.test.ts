import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeRequest,
  seedStorage,
} from "./helpers";
import { handleRequest } from "../../../cli/commands/request";
import type { ParsedArgs } from "../../../cli/main";
import { startCapture, endCapture } from "../../../cli/output";

const paths: string[] = [];

beforeEach(() => {
  startCapture();
});

afterEach(() => {
  endCapture();
  for (const p of paths) cleanupFile(p);
  paths.length = 0;
});

function baseParsed(overrides?: Partial<ParsedArgs>): ParsedArgs {
  return { command: "", args: [], flags: {}, showSecrets: false, dataFile: null, ...overrides };
}
function parseOutput(): any { return JSON.parse(endCapture()); }

describe("request list", () => {
  it("lists requests in a collection", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { name: "Get Users", method: "GET", url: "https://api.com/users" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    await handleRequest(
      "list",
      baseParsed({ flags: { collection: [coll.id] } }),
      data,
    );
    const output = parseOutput();
    expect(output.count).toBe(1);
    expect(output.data[0]).toMatchObject({
      name: "Get Users",
      method: "GET",
      url: "https://api.com/users",
    });
  });
});

describe("request get", () => {
  it("masks auth by default", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, {
      auth: { type: "basic", username: "user", password: "pass" },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    await handleRequest("get", baseParsed({ args: [req.id] }), data);
    const output = parseOutput();
    expect(output.data.auth.password).toBe("*****");
    expect(output.data.auth.username).toBe("user");
  });

  it("masks sensitive headers", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, {
      headers: [
        { id: "1", key: "Authorization", value: "Bearer tok", enabled: true },
        { id: "2", key: "Accept", value: "application/json", enabled: true },
      ],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    await handleRequest("get", baseParsed({ args: [req.id] }), data);
    const output = parseOutput();
    expect(output.data.headers[0].value).toBe("*****");
    expect(output.data.headers[1].value).toBe("application/json");
  });

  it("returns specific fields", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { url: "https://example.com" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    await handleRequest(
      "get",
      baseParsed({ args: [req.id], flags: { fields: ["url,method"] } }),
      data,
    );
    const output = parseOutput();
    expect(Object.keys(output.data).sort()).toEqual(["id", "method", "url"]);
  });
});

describe("request create", () => {
  it("creates with defaults", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    await handleRequest(
      "create",
      baseParsed({ flags: { collection: [coll.id] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("New Request");
    expect(output.data.method).toBe("GET");
  });

  it("creates with all options", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    await handleRequest(
      "create",
      baseParsed({
        flags: {
          collection: [coll.id],
          name: ["Create User"],
          method: ["post"],
          url: ["https://api.com/users"],
        },
      }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("Create User");
    expect(output.data.method).toBe("POST");
    expect(output.data.url).toBe("https://api.com/users");
  });
});

describe("request update", () => {
  it("updates method and url", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);

    await handleRequest(
      "update",
      baseParsed({ args: [req.id], flags: { method: ["PUT"], url: ["https://new.com"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.method).toBe("PUT");
    expect(output.data.url).toBe("https://new.com");
  });

  it("adds headers", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);

    await handleRequest(
      "update",
      baseParsed({
        args: [req.id],
        flags: { "set-header": ["Content-Type: application/json", "Accept: text/html"] },
      }),
      data,
    );
    const output = parseOutput();
    expect(output.data.headers).toHaveLength(2);
    expect(output.data.headers[0].key).toBe("Content-Type");
  });

  it("sets auth", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);

    await handleRequest(
      "update",
      baseParsed({ args: [req.id], flags: { "auth-bearer": ["my-token"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.auth.type).toBe("bearer");
    expect(output.data.auth.token).toBe("*****");
  });

  it("sets body-json", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);

    await handleRequest(
      "update",
      baseParsed({ args: [req.id], flags: { "body-json": ['{"key":"value"}'] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.body.type).toBe("json");
    expect(output.data.body.content).toBe('{"key":"value"}');
  });
});

describe("request delete", () => {
  it("deletes a request", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);

    await handleRequest("delete", baseParsed({ args: [req.id] }), data);
    expect(await data.getRequest(req.id)).toBeNull();
  });
});
