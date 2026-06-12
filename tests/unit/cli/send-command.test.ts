import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  createTestStorage,
  cleanupFile,
  makeCollection,
  makeRequest,
  makeEnvironment,
  makeVariable,
  seedStorage,
} from "./helpers";
import { handleSend } from "../../../cli/commands/send";
import type { ParsedArgs } from "../../../cli/main";
import { startCapture, endCapture } from "../../../cli/output";

const paths: string[] = [];

beforeEach(() => {
  startCapture();
});

afterEach(() => {
  endCapture();
  vi.restoreAllMocks();
  for (const p of paths) cleanupFile(p);
  paths.length = 0;
});

function baseParsed(overrides?: Partial<ParsedArgs>): ParsedArgs {
  return { command: "send", args: [], flags: {}, showSecrets: false, dataFile: null, ...overrides };
}
function parseOutput(): any { return JSON.parse(endCapture()); }

function mockFetch(body: string, init?: { status?: number; statusText?: string; headers?: Record<string, string> }) {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? "OK";
  const headers = new Headers(init?.headers ?? { "content-type": "application/json" });

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    status,
    statusText,
    headers,
    text: () => Promise.resolve(body),
  }));
}

describe("send command", () => {
  it("sends a basic GET request", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { method: "GET", url: "https://api.example.com/users" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch('{"users":[]}', { status: 200, statusText: "OK" });

    await handleSend(baseParsed({ args: [req.id], flags: { "no-history": ["true"] } }), data);
    const output = parseOutput();
    expect(output.data.statusCode).toBe(200);
    expect(output.data.body).toBe('{"users":[]}');
    expect(output.data.timing.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("masks response headers by default", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { url: "https://api.example.com" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch("{}", {
      headers: { "set-cookie": "session=abc", "content-type": "application/json" },
    });

    await handleSend(baseParsed({ args: [req.id], flags: { "no-history": ["true"] } }), data);
    const output = parseOutput();

    const setCookieHeader = output.data.headers.find((h: any) => h.key === "set-cookie");
    const contentTypeHeader = output.data.headers.find((h: any) => h.key === "content-type");
    expect(setCookieHeader.value).toBe("*****");
    expect(contentTypeHeader.value).toBe("application/json");
  });

  it("reveals headers with showSecrets", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { url: "https://api.example.com" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch("{}", { headers: { "set-cookie": "session=abc" } });

    await handleSend(
      baseParsed({ args: [req.id], showSecrets: true, flags: { "no-history": ["true"] } }),
      data,
    );
    const output = parseOutput();
    const setCookieHeader = output.data.headers.find((h: any) => h.key === "set-cookie");
    expect(setCookieHeader.value).toBe("session=abc");
  });

  it("saves to history by default", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { url: "https://api.example.com" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch('{"ok":true}');

    await handleSend(baseParsed({ args: [req.id] }), data);
    parseOutput();

    const history = await data.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].requestId).toBe(req.id);
    expect(history[0].response.statusCode).toBe(200);
  });

  it("skips history with --no-history", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, { url: "https://api.example.com" });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch("{}");

    await handleSend(baseParsed({ args: [req.id], flags: { "no-history": ["true"] } }), data);
    parseOutput();

    const history = await data.getHistory();
    expect(history).toHaveLength(0);
  });

  it("resolves environment variables in headers", async () => {
    const coll = makeCollection();
    const env = makeEnvironment(coll.id, {
      variables: [makeVariable({ name: "MY_TOKEN", initialValue: "secret-tok", currentValue: "secret-tok" })],
    });
    const collWithEnv = { ...coll, activeEnvironmentId: env.id };
    const req = makeRequest(coll.id, {
      url: "https://api.example.com/users",
      headers: [{ id: "1", key: "X-Custom", value: "{{MY_TOKEN}}", enabled: true }],
    });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [collWithEnv],
        requests: new Map([[req.id, req]]),
        environments: [env],
      }),
    );
    paths.push(filePath);

    mockFetch("[]");

    await handleSend(baseParsed({ args: [req.id], flags: { "no-history": ["true"] } }), data);
    parseOutput();

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[1].headers["X-Custom"]).toBe("secret-tok");
  });

  it("applies bearer auth", async () => {
    const coll = makeCollection();
    const req = makeRequest(coll.id, {
      url: "https://api.example.com",
      auth: { type: "bearer", token: "my-token" },
    });
    const { data, filePath } = createTestStorage(
      seedStorage({
        collections: [coll],
        requests: new Map([[req.id, req]]),
      }),
    );
    paths.push(filePath);

    mockFetch("{}");

    await handleSend(baseParsed({ args: [req.id], flags: { "no-history": ["true"] } }), data);
    parseOutput();

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[1].headers["Authorization"]).toBe("Bearer my-token");
  });

  it("returns error for missing request", async () => {
    const { data, filePath } = createTestStorage();
    paths.push(filePath);

    await expect(
      handleSend(baseParsed({ args: ["nonexistent"] }), data),
    ).rejects.toThrow();
  });
});
