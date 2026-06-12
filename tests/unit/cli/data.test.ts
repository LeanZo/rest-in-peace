import { describe, it, expect, afterEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeFolder,
  makeRequest,
  makeEnvironment,
  makeHistoryEntry,
  makeVariable,
  seedStorage,
} from "./helpers";

const paths: string[] = [];
afterEach(() => {
  for (const p of paths) cleanupFile(p);
  paths.length = 0;
});

describe("DataLayer read operations", () => {
  it("returns empty arrays for empty storage", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    expect(await data.getCollections()).toEqual([]);
    expect((await data.getFolders()).size).toBe(0);
    expect((await data.getRequests()).size).toBe(0);
    expect(await data.getEnvironments()).toEqual([]);
    expect(await data.getHistory()).toEqual([]);
  });

  it("reads seeded collections", async () => {
    const coll = makeCollection({ name: "API" });
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    const collections = await data.getCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].name).toBe("API");
  });

  it("reads seeded folders and requests as Maps", async () => {
    const coll = makeCollection();
    const folder = makeFolder(coll.id);
    const request = makeRequest(coll.id);

    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        folders: new Map([[folder.id, folder]]),
        requests: new Map([[request.id, request]]),
      }),
    );
    paths.push(filePath);

    const folders = await data.getFolders();
    expect(folders.get(folder.id)?.name).toBe("Test Folder");

    const requests = await data.getRequests();
    expect(requests.get(request.id)?.name).toBe("Test Request");
  });
});

describe("DataLayer resolveEntity", () => {
  it("resolves collection by ID", async () => {
    const coll = makeCollection();
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    const result = await data.resolveEntity(coll.id);
    expect(result?.type).toBe("collection");
  });

  it("resolves folder by ID", async () => {
    const coll = makeCollection();
    const folder = makeFolder(coll.id);
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        folders: new Map([[folder.id, folder]]),
      }),
    );
    paths.push(filePath);

    const result = await data.resolveEntity(folder.id);
    expect(result?.type).toBe("folder");
  });

  it("resolves request by ID", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id);
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    const result = await data.resolveEntity(req.id);
    expect(result?.type).toBe("request");
  });

  it("resolves environment by ID", async () => {
    const env = makeEnvironment("c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ environments: [env] }),
    );
    paths.push(filePath);

    const result = await data.resolveEntity(env.id);
    expect(result?.type).toBe("environment");
  });

  it("resolves history by ID", async () => {
    const entry = makeHistoryEntry("r1", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [entry] }),
    );
    paths.push(filePath);

    const result = await data.resolveEntity(entry.id);
    expect(result?.type).toBe("history");
  });

  it("returns null for unknown ID", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const result = await data.resolveEntity("nonexistent");
    expect(result).toBeNull();
  });
});

describe("DataLayer create operations", () => {
  it("creates a collection", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("New API", "A test API");
    expect(coll.name).toBe("New API");
    expect(coll.description).toBe("A test API");
    expect(coll.id).toBeTruthy();

    const collections = await data.getCollections();
    expect(collections).toHaveLength(1);
  });

  it("creates a folder and updates parent", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Users");
    expect(folder.collectionId).toBe(coll.id);

    const updated = await data.getCollection(coll.id);
    expect(updated?.rootItemIds).toContain(folder.id);
  });

  it("creates a nested folder", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const parent = await data.createFolder(coll.id, "Users");
    const child = await data.createFolder(coll.id, "Admin", parent.id);
    expect(child.parentFolderId).toBe(parent.id);

    const parentUpdated = await data.getFolder(parent.id);
    expect(parentUpdated?.childItemIds).toContain(child.id);
  });

  it("creates a request and updates parent", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id, "Get Users", "GET", "https://example.com/users");

    expect(req.name).toBe("Get Users");
    expect(req.method).toBe("GET");
    expect(req.url).toBe("https://example.com/users");

    const updated = await data.getCollection(coll.id);
    expect(updated?.rootItemIds).toContain(req.id);
  });

  it("creates a request in a folder", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Users");
    const req = await data.createRequest(coll.id, "Get User", "GET", "/users", folder.id);

    expect(req.parentFolderId).toBe(folder.id);
    const folderUpdated = await data.getFolder(folder.id);
    expect(folderUpdated?.childItemIds).toContain(req.id);
  });

  it("creates an environment", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Production");
    expect(env.name).toBe("Production");
    expect(env.collectionId).toBe(coll.id);
  });
});

describe("DataLayer update operations", () => {
  it("updates a collection", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("Old");
    const updated = await data.updateCollection(coll.id, { name: "New" });
    expect(updated?.name).toBe("New");
  });

  it("updates a request", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id);
    const updated = await data.updateRequest(req.id, {
      method: "POST",
      url: "https://example.com/create",
    });
    expect(updated?.method).toBe("POST");
    expect(updated?.url).toBe("https://example.com/create");
  });

  it("sets and deletes environment variables", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Dev");

    await data.setVariable(env.id, "API_KEY", "secret", true);
    let updated = await data.getEnvironment(env.id);
    expect(updated?.variables).toHaveLength(1);
    expect(updated?.variables[0].name).toBe("API_KEY");
    expect(updated?.variables[0].isSecret).toBe(true);

    await data.setVariable(env.id, "API_KEY", "new-secret", true);
    updated = await data.getEnvironment(env.id);
    expect(updated?.variables).toHaveLength(1);
    expect(updated?.variables[0].currentValue).toBe("new-secret");

    await data.deleteVariable(env.id, "API_KEY");
    updated = await data.getEnvironment(env.id);
    expect(updated?.variables).toHaveLength(0);
  });
});

describe("DataLayer delete operations", () => {
  it("deletes a collection and cascades", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Users");
    const req = await data.createRequest(coll.id, "Get", "GET", "/", folder.id);
    const env = await data.createEnvironment(coll.id, "Dev");

    const deleted = await data.deleteCollection(coll.id);
    expect(deleted).toBe(true);

    expect(await data.getCollections()).toHaveLength(0);
    expect(await data.getFolder(folder.id)).toBeNull();
    expect(await data.getRequest(req.id)).toBeNull();
    expect(await data.getEnvironmentsForCollection(coll.id)).toHaveLength(0);
  });

  it("deletes a folder and cascades to children", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const folder = await data.createFolder(coll.id, "Users");
    const req = await data.createRequest(coll.id, "Get", "GET", "/", folder.id);

    await data.deleteFolder(folder.id);
    expect(await data.getFolder(folder.id)).toBeNull();
    expect(await data.getRequest(req.id)).toBeNull();

    const updated = await data.getCollection(coll.id);
    expect(updated?.rootItemIds).not.toContain(folder.id);
  });

  it("deletes a request and updates parent", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const req = await data.createRequest(coll.id, "Get");

    await data.deleteRequest(req.id);
    expect(await data.getRequest(req.id)).toBeNull();

    const updated = await data.getCollection(coll.id);
    expect(updated?.rootItemIds).not.toContain(req.id);
  });

  it("deletes an environment", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    const coll = await data.createCollection("API");
    const env = await data.createEnvironment(coll.id, "Dev");

    const deleted = await data.deleteEnvironment(env.id);
    expect(deleted).toBe(true);
    expect(await data.getEnvironment(env.id)).toBeNull();
  });

  it("returns false for nonexistent delete targets", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    expect(await data.deleteCollection("nope")).toBe(false);
    expect(await data.deleteFolder("nope")).toBe(false);
    expect(await data.deleteRequest("nope")).toBe(false);
    expect(await data.deleteEnvironment("nope")).toBe(false);
  });

  it("clears history for a request", async () => {
    const entry = makeHistoryEntry("r1", "c1");
    const entry2 = makeHistoryEntry("r2", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [entry, entry2] }),
    );
    paths.push(filePath);

    await data.clearRequestHistory("r1");
    const remaining = await data.getHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].requestId).toBe("r2");
  });

  it("clears all history", async () => {
    const entry = makeHistoryEntry("r1", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [entry] }),
    );
    paths.push(filePath);

    await data.clearAllHistory();
    expect(await data.getHistory()).toHaveLength(0);
  });
});
