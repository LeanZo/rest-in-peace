import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeRequest,
  seedStorage,
} from "./helpers";
import { handleCollection } from "../../../cli/commands/collection";
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
  return {
    command: "list",
    args: [],
    flags: {},
    showSecrets: false,
    dataFile: null,
    ...overrides,
  };
}

function parseOutput(): any {
  return JSON.parse(endCapture());
}

describe("collection list", () => {
  it("lists all collections with summary fields", async () => {
    const coll = makeCollection({ name: "My API" });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleCollection("list", baseParsed(), data);
    const output = parseOutput();
    expect(output.count).toBe(1);
    expect(output.data[0]).toEqual({
      id: coll.id,
      name: "My API",
      description: undefined,
      activeEnvironmentId: null,
      itemCount: 0,
    });
  });

  it("returns empty list when no collections", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    await handleCollection("list", baseParsed(), data);
    expect(parseOutput()).toEqual({ data: [], count: 0 });
  });
});

describe("collection get", () => {
  it("returns full collection with masked auth", async () => {
    const coll = makeCollection({
      auth: { type: "bearer", token: "secret" },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleCollection("get", baseParsed({ args: [coll.id] }), data);
    const output = parseOutput();
    expect(output.data.auth.token).toBe("*****");
  });

  it("reveals secrets with showSecrets", async () => {
    const coll = makeCollection({
      auth: { type: "bearer", token: "real-token" },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleCollection(
      "get",
      baseParsed({ args: [coll.id], showSecrets: true }),
      data,
    );
    const output = parseOutput();
    expect(output.data.auth.token).toBe("real-token");
  });

  it("supports field filtering", async () => {
    const coll = makeCollection({ name: "My API", description: "desc" });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleCollection(
      "get",
      baseParsed({ args: [coll.id], flags: { fields: ["name,description"] } }),
      data,
    );
    const output = parseOutput();
    expect(Object.keys(output.data).sort()).toEqual(["description", "id", "name"]);
  });
});

describe("collection create", () => {
  it("creates a collection with name and description", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    await handleCollection(
      "create",
      baseParsed({ flags: { name: ["New API"], description: ["A test"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("New API");
    expect(output.data.description).toBe("A test");
    expect(output.data.id).toBeTruthy();
  });
});

describe("collection update", () => {
  it("updates collection name", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("Old");
    await handleCollection(
      "update",
      baseParsed({ args: [coll.id], flags: { name: ["New"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("New");
  });
});

describe("collection delete", () => {
  it("deletes a collection", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("Delete Me");
    await handleCollection("delete", baseParsed({ args: [coll.id] }), data);
    const output = parseOutput();
    expect(output.data.deleted).toBe(true);

    expect(await data.getCollection(coll.id)).toBeNull();
  });
});
