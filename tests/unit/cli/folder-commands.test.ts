import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeFolder,
  makeRequest,
  seedStorage,
} from "./helpers";
import { handleFolder } from "../../../cli/commands/folder";
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

describe("folder list", () => {
  it("lists folders in a collection", async () => {
    const coll = makeCollection();
    const folder = makeFolder(coll.id, { name: "Users", childItemIds: ["r1", "r2"] });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        folders: new Map([[folder.id, folder]]),
      }),
    );
    paths.push(filePath);

    await handleFolder("list", baseParsed({ flags: { collection: [coll.id] } }), data);
    const output = parseOutput();
    expect(output.count).toBe(1);
    expect(output.data[0]).toMatchObject({
      name: "Users",
      itemCount: 2,
    });
  });

  it("returns empty for collection with no folders", async () => {
    const coll = makeCollection();
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleFolder("list", baseParsed({ flags: { collection: [coll.id] } }), data);
    expect(parseOutput()).toEqual({ data: [], count: 0 });
  });
});

describe("folder get", () => {
  it("returns full folder details", async () => {
    const coll = makeCollection();
    const folder = makeFolder(coll.id, { name: "Auth" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        folders: new Map([[folder.id, folder]]),
      }),
    );
    paths.push(filePath);

    await handleFolder("get", baseParsed({ args: [folder.id] }), data);
    const output = parseOutput();
    expect(output.data.name).toBe("Auth");
    expect(output.data.collectionId).toBe(coll.id);
  });

  it("supports field filtering", async () => {
    const coll = makeCollection();
    const folder = makeFolder(coll.id, { name: "Users" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        folders: new Map([[folder.id, folder]]),
      }),
    );
    paths.push(filePath);

    await handleFolder(
      "get",
      baseParsed({ args: [folder.id], flags: { fields: ["name,collectionId"] } }),
      data,
    );
    const output = parseOutput();
    expect(Object.keys(output.data).sort()).toEqual(["collectionId", "id", "name"]);
  });
});

describe("folder create", () => {
  it("creates a root folder", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    await handleFolder(
      "create",
      baseParsed({ flags: { collection: [coll.id], name: ["Users"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("Users");
    expect(output.data.collectionId).toBe(coll.id);
    expect(output.data.parentFolderId).toBeNull();
  });

  it("creates a nested folder", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const parent = await data.createFolder(coll.id, "Resources");

    await handleFolder(
      "create",
      baseParsed({ flags: { collection: [coll.id], name: ["Nested"], parent: [parent.id] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.parentFolderId).toBe(parent.id);
  });
});

describe("folder update", () => {
  it("updates folder name", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Old");

    await handleFolder(
      "update",
      baseParsed({ args: [folder.id], flags: { name: ["New"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.data.name).toBe("New");
  });
});

describe("folder delete", () => {
  it("deletes a folder", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Remove Me");

    await handleFolder("delete", baseParsed({ args: [folder.id] }), data);
    const output = parseOutput();
    expect(output.data.deleted).toBe(true);
    expect(await data.getFolder(folder.id)).toBeNull();
  });

  it("cascade deletes child requests", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Parent");
    const req = await data.createRequest(coll.id, "Child Request", "GET", "/test", folder.id);

    await handleFolder("delete", baseParsed({ args: [folder.id] }), data);
    expect(await data.getFolder(folder.id)).toBeNull();
    expect(await data.getRequest(req.id)).toBeNull();
  });
});
