import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileStorageAdapter } from "../../../cli/storage";
import { DataLayer } from "../../../cli/data";
import type { Collection, Folder } from "@/core/models/collection";
import type { RequestConfig, AuthConfig, RequestBody } from "@/core/models/request";
import type { Environment, EnvironmentVariable } from "@/core/models/environment";
import type { HistoryEntry } from "@/core/models/history";
import type { CookieData } from "@/core/models/cookie";
import type { EntityId } from "@/core/models/primitives";

function uniquePath(): string {
  return join(tmpdir(), `rip-test-${crypto.randomUUID()}.json`);
}

export function createTestStorage(initialData?: Record<string, unknown>): {
  storage: FileStorageAdapter;
  data: DataLayer;
  filePath: string;
} {
  const filePath = uniquePath();
  if (initialData) {
    writeFileSync(filePath, JSON.stringify(initialData, null, 2));
  }
  const storage = new FileStorageAdapter(filePath);
  const data = new DataLayer(storage);
  return { storage, data, filePath };
}

export function cleanupFile(filePath: string): void {
  if (existsSync(filePath)) rmSync(filePath);
}

export function makeCollection(overrides?: Partial<Collection>): Collection {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Collection",
    rootItemIds: [],
    activeEnvironmentId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeFolder(
  collectionId: EntityId,
  overrides?: Partial<Folder>,
): Folder {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    collectionId,
    parentFolderId: null,
    name: "Test Folder",
    childItemIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeRequest(
  collectionId: EntityId,
  overrides?: Partial<RequestConfig>,
): RequestConfig {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    collectionId,
    parentFolderId: null,
    name: "Test Request",
    method: "GET",
    url: "https://example.com/api",
    params: [],
    headers: [],
    body: { type: "none" },
    auth: { type: "none" },
    routeParams: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeEnvironment(
  collectionId: EntityId,
  overrides?: Partial<Environment>,
): Environment {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    collectionId,
    name: "Test Env",
    variables: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeVariable(
  overrides?: Partial<EnvironmentVariable>,
): EnvironmentVariable {
  return {
    id: crypto.randomUUID(),
    name: "VAR",
    initialValue: "value",
    currentValue: "value",
    isSecret: false,
    enabled: true,
    ...overrides,
  };
}

export function makeHistoryEntry(
  requestId: EntityId,
  collectionId: EntityId,
  overrides?: Partial<HistoryEntry>,
): HistoryEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    requestId,
    collectionId,
    timestamp: Date.now(),
    resolvedRequest: {
      method: "GET",
      url: "https://example.com/api",
      headers: [],
      body: null,
    },
    response: {
      statusCode: 200,
      statusText: "OK",
      headers: [],
      body: "{}",
      contentType: "application/json",
      bodySize: 2,
      cookies: [],
      timing: { totalMs: 100 },
    },
    environmentName: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function seedStorage(opts: {
  collections?: Collection[];
  folders?: Map<EntityId, Folder>;
  requests?: Map<EntityId, RequestConfig>;
  environments?: Environment[];
  history?: HistoryEntry[];
  cookies?: Map<EntityId, CookieData[]>;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (opts.collections || opts.folders || opts.requests) {
    data.collections = {
      collections: opts.collections ?? [],
      folders: opts.folders ? [...opts.folders.entries()] : [],
      requests: opts.requests ? [...opts.requests.entries()] : [],
    };
  }
  if (opts.environments) data.environments = opts.environments;
  if (opts.history) data.history = opts.history;
  if (opts.cookies) data.cookies = [...opts.cookies.entries()];

  return data;
}
