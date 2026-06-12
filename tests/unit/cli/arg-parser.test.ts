import { describe, it, expect } from "vitest";
import { parseArgs } from "../../../cli/main";

describe("parseArgs", () => {
  it("parses a simple command", () => {
    const result = parseArgs(["list", "collections"]);
    expect(result.command).toBe("list");
    expect(result.args).toEqual(["collections"]);
    expect(result.showSecrets).toBe(false);
    expect(result.dataFile).toBeNull();
  });

  it("parses command with ID", () => {
    const result = parseArgs(["get", "abc-123"]);
    expect(result.command).toBe("get");
    expect(result.args).toEqual(["abc-123"]);
  });

  it("parses named flags", () => {
    const result = parseArgs([
      "list",
      "requests",
      "--collection",
      "coll-1",
      "--folder",
      "fold-1",
    ]);
    expect(result.command).toBe("list");
    expect(result.args).toEqual(["requests"]);
    expect(result.flags.collection).toEqual(["coll-1"]);
    expect(result.flags.folder).toEqual(["fold-1"]);
  });

  it("parses repeatable flags", () => {
    const result = parseArgs([
      "update",
      "req-1",
      "--set-header",
      "Content-Type: application/json",
      "--set-header",
      "Accept: text/html",
    ]);
    expect(result.flags["set-header"]).toEqual([
      "Content-Type: application/json",
      "Accept: text/html",
    ]);
  });

  it("parses boolean flags", () => {
    const result = parseArgs([
      "delete",
      "--history-all",
    ]);
    expect(result.command).toBe("delete");
    expect(result.flags["history-all"]).toEqual(["true"]);
  });

  it("parses --show-secrets as global flag", () => {
    const result = parseArgs(["get", "abc", "--show-secrets"]);
    expect(result.showSecrets).toBe(true);
    expect(result.flags["show-secrets"]).toBeUndefined();
  });

  it("parses --data-file as global flag", () => {
    const result = parseArgs(["list", "collections", "--data-file", "/tmp/data.json"]);
    expect(result.dataFile).toBe("/tmp/data.json");
    expect(result.flags["data-file"]).toBeUndefined();
  });

  it("handles empty argv", () => {
    const result = parseArgs([]);
    expect(result.command).toBe("");
    expect(result.args).toEqual([]);
  });

  it("handles mixed positional and flags", () => {
    const result = parseArgs([
      "create",
      "request",
      "--collection",
      "c1",
      "--name",
      "My Request",
      "--method",
      "POST",
      "--url",
      "https://example.com",
    ]);
    expect(result.command).toBe("create");
    expect(result.args).toEqual(["request"]);
    expect(result.flags.collection).toEqual(["c1"]);
    expect(result.flags.name).toEqual(["My Request"]);
    expect(result.flags.method).toEqual(["POST"]);
    expect(result.flags.url).toEqual(["https://example.com"]);
  });

  it("handles flag followed by another flag (boolean)", () => {
    const result = parseArgs(["send", "r1", "--no-history", "--show-secrets"]);
    expect(result.flags["no-history"]).toEqual(["true"]);
    expect(result.showSecrets).toBe(true);
  });

  it("handles --fields flag with comma-separated values", () => {
    const result = parseArgs(["get", "abc", "--fields", "url,method,headers"]);
    expect(result.flags.fields).toEqual(["url,method,headers"]);
  });
});
