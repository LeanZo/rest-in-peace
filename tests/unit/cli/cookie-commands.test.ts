import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  seedStorage,
} from "./helpers";
import { handleCookie } from "../../../cli/commands/cookie";
import type { ParsedArgs } from "../../../cli/main";
import type { CookieData } from "@/core/models/cookie";
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

function makeCookie(overrides?: Partial<CookieData>): CookieData {
  return {
    name: "session",
    value: "abc123",
    domain: "example.com",
    path: "/",
    httpOnly: true,
    secure: true,
    ...overrides,
  };
}

describe("cookie list", () => {
  it("lists cookies for a collection with masking", async () => {
    const coll = makeCollection();
    const cookie = makeCookie({ name: "token", value: "secret-value" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        cookies: new Map([[coll.id, [cookie]]]),
      }),
    );
    paths.push(filePath);

    await handleCookie("list", baseParsed({ flags: { collection: [coll.id] } }), data);
    const output = parseOutput();
    expect(output.count).toBe(1);
    expect(output.data[0].name).toBe("token");
    expect(output.data[0].value).toBe("*****");
  });

  it("reveals cookie values with showSecrets", async () => {
    const coll = makeCollection();
    const cookie = makeCookie({ value: "real-value" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        cookies: new Map([[coll.id, [cookie]]]),
      }),
    );
    paths.push(filePath);

    await handleCookie(
      "list",
      baseParsed({ flags: { collection: [coll.id] }, showSecrets: true }),
      data,
    );
    const output = parseOutput();
    expect(output.data[0].value).toBe("real-value");
  });

  it("returns empty list when no cookies", async () => {
    const coll = makeCollection();
    const { data, filePath } = createTestStorage(
      seedStorage({ collections: [coll] }),
    );
    paths.push(filePath);

    await handleCookie("list", baseParsed({ flags: { collection: [coll.id] } }), data);
    expect(parseOutput()).toEqual({ data: [], count: 0 });
  });
});

describe("cookie clear", () => {
  it("clears cookies for a collection", async () => {
    const coll = makeCollection();
    const cookie = makeCookie();
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        cookies: new Map([[coll.id, [cookie]]]),
      }),
    );
    paths.push(filePath);

    await handleCookie("clear", baseParsed({ flags: { cookies: [coll.id] } }), data);
    const output = parseOutput();
    expect(output.data.cleared).toBe(true);

    startCapture();
    await handleCookie("list", baseParsed({ flags: { collection: [coll.id] } }), data);
    expect(parseOutput().count).toBe(0);
  });
});
