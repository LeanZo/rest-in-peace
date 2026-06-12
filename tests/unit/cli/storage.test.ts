import { describe, it, expect, afterEach } from "vitest";
import { FileStorageAdapter } from "../../../cli/storage";
import { createTestStorage, cleanupFile } from "./helpers";

const paths: string[] = [];

afterEach(() => {
  for (const p of paths) cleanupFile(p);
  paths.length = 0;
});

describe("FileStorageAdapter", () => {
  it("returns null for missing keys on empty file", async () => {
    const { storage, filePath } = createTestStorage();
    paths.push(filePath);

    const result = await storage.get("nonexistent");
    expect(result).toBeNull();
  });

  it("writes and reads back data", async () => {
    const { storage, filePath } = createTestStorage();
    paths.push(filePath);

    await storage.set("test", { hello: "world" });
    const result = await storage.get<{ hello: string }>("test");
    expect(result).toEqual({ hello: "world" });
  });

  it("persists data across adapter instances", async () => {
    const { filePath } = createTestStorage();
    paths.push(filePath);

    const storage1 = new FileStorageAdapter(filePath);
    await storage1.set("key", [1, 2, 3]);

    const storage2 = new FileStorageAdapter(filePath);
    const result = await storage2.get<number[]>("key");
    expect(result).toEqual([1, 2, 3]);
  });

  it("deletes keys", async () => {
    const { storage, filePath } = createTestStorage();
    paths.push(filePath);

    await storage.set("a", 1);
    await storage.set("b", 2);
    await storage.delete("a");

    expect(await storage.get("a")).toBeNull();
    expect(await storage.get("b")).toBe(2);
  });

  it("lists keys", async () => {
    const { storage, filePath } = createTestStorage();
    paths.push(filePath);

    await storage.set("alpha", 1);
    await storage.set("beta", 2);
    const keys = await storage.keys();
    expect(keys.sort()).toEqual(["alpha", "beta"]);
  });

  it("loads existing data file", async () => {
    const { storage, filePath } = createTestStorage({ existing: "data" });
    paths.push(filePath);

    const result = await storage.get<string>("existing");
    expect(result).toBe("data");
  });

  it("creates parent directories if needed", async () => {
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const deepPath = join(
      tmpdir(),
      `rip-test-deep-${Date.now()}`,
      "nested",
      "data.json",
    );
    paths.push(deepPath);

    const storage = new FileStorageAdapter(deepPath);
    await storage.set("test", true);

    const storage2 = new FileStorageAdapter(deepPath);
    expect(await storage2.get("test")).toBe(true);

    const { rmSync } = await import("node:fs");
    rmSync(join(tmpdir(), `rip-test-deep-${Date.now()}`), {
      recursive: true,
      force: true,
    });
  });

  it("handles concurrent writes to different keys", async () => {
    const { storage, filePath } = createTestStorage();
    paths.push(filePath);

    await storage.set("a", 1);
    await storage.set("b", 2);
    await storage.set("c", 3);

    expect(await storage.get("a")).toBe(1);
    expect(await storage.get("b")).toBe(2);
    expect(await storage.get("c")).toBe(3);
  });
});
