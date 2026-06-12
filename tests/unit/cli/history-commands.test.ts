import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeHistoryEntry,
  seedStorage,
} from "./helpers";
import { handleHistory } from "../../../cli/commands/history";
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

describe("history list", () => {
  it("lists all history entries", async () => {
    const e1 = makeHistoryEntry("r1", "c1", { timestamp: 1000 });
    const e2 = makeHistoryEntry("r2", "c1", { timestamp: 2000 });
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory("list", baseParsed(), data);
    const output = parseOutput();
    expect(output.count).toBe(2);
    expect(output.data[0].timestamp).toBe(2000);
  });

  it("filters by collection", async () => {
    const e1 = makeHistoryEntry("r1", "c1");
    const e2 = makeHistoryEntry("r2", "c2");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory(
      "list",
      baseParsed({ flags: { collection: ["c1"] } }),
      data,
    );
    const output = parseOutput();
    expect(output.count).toBe(1);
  });

  it("filters by request", async () => {
    const e1 = makeHistoryEntry("r1", "c1");
    const e2 = makeHistoryEntry("r2", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory(
      "list",
      baseParsed({ flags: { request: ["r1"] } }),
      data,
    );
    expect(parseOutput().count).toBe(1);
  });

  it("filters by method", async () => {
    const e1 = makeHistoryEntry("r1", "c1", {
      resolvedRequest: { method: "GET", url: "/", headers: [], body: null },
    });
    const e2 = makeHistoryEntry("r2", "c1", {
      resolvedRequest: { method: "POST", url: "/", headers: [], body: null },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory(
      "list",
      baseParsed({ flags: { method: ["POST"] } }),
      data,
    );
    expect(parseOutput().count).toBe(1);
  });

  it("filters by status range", async () => {
    const e1 = makeHistoryEntry("r1", "c1", {
      response: {
        statusCode: 200,
        statusText: "OK",
        headers: [],
        body: "",
        contentType: "",
        bodySize: 0,
        cookies: [],
        timing: { totalMs: 50 },
      },
    });
    const e2 = makeHistoryEntry("r2", "c1", {
      response: {
        statusCode: 404,
        statusText: "Not Found",
        headers: [],
        body: "",
        contentType: "",
        bodySize: 0,
        cookies: [],
        timing: { totalMs: 50 },
      },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory(
      "list",
      baseParsed({ flags: { status: ["4xx"] } }),
      data,
    );
    expect(parseOutput().count).toBe(1);
  });

  it("limits results", async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeHistoryEntry("r1", "c1", { timestamp: i }),
    );
    const { data, filePath } = createTestStorage(
      seedStorage({ history: entries }),
    );
    paths.push(filePath);

    await handleHistory(
      "list",
      baseParsed({ flags: { limit: ["2"] } }),
      data,
    );
    expect(parseOutput().count).toBe(2);
  });
});

describe("history get", () => {
  it("returns full entry with masked headers", async () => {
    const entry = makeHistoryEntry("r1", "c1", {
      resolvedRequest: {
        method: "GET",
        url: "https://api.com",
        headers: [{ key: "Authorization", value: "Bearer secret" }],
        body: null,
      },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [entry] }),
    );
    paths.push(filePath);

    await handleHistory("get", baseParsed({ args: [entry.id] }), data);
    const output = parseOutput();
    expect(output.data.resolvedRequest.headers[0].value).toBe("*****");
  });
});

describe("history clear", () => {
  it("clears all history", async () => {
    const e1 = makeHistoryEntry("r1", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1] }),
    );
    paths.push(filePath);

    await handleHistory("clear-all", baseParsed(), data);
    expect(await data.getHistory()).toHaveLength(0);
    expect(parseOutput().data.cleared).toBe(true);
  });

  it("clears history for a request", async () => {
    const e1 = makeHistoryEntry("r1", "c1");
    const e2 = makeHistoryEntry("r2", "c1");
    const { data, filePath } = createTestStorage(
      seedStorage({ history: [e1, e2] }),
    );
    paths.push(filePath);

    await handleHistory(
      "clear-request",
      baseParsed({ flags: { "history-request": ["r1"] } }),
      data,
    );
    const remaining = await data.getHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].requestId).toBe("r2");
  });
});
