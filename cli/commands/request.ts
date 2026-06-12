import type { RequestConfig, AuthConfig, RequestBody } from "@/core/models/request";
import type { KeyValueEntry, HttpMethod } from "@/core/models/primitives";
import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { maskAuth, maskHeaders } from "../secrets";
import { getFlag, getAllFlags, hasFlag } from "../main";

const VALID_METHODS = new Set<string>([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE",
]);

function maskRequest(r: RequestConfig, showSecrets: boolean): RequestConfig {
  if (showSecrets) return r;
  return {
    ...r,
    auth: maskAuth(r.auth),
    headers: maskHeaders(r.headers),
  };
}

function pickFields(data: Record<string, unknown>, fields: string): Record<string, unknown> {
  const keys = fields.split(",").map((f) => f.trim());
  const result: Record<string, unknown> = { id: data.id };
  for (const key of keys) {
    if (key in data) result[key] = data[key];
  }
  return result;
}

function parseHeaderFlag(raw: string): { key: string; value: string } | null {
  const sep = raw.indexOf(":");
  if (sep === -1) return null;
  return { key: raw.substring(0, sep).trim(), value: raw.substring(sep + 1).trim() };
}

function parseParamFlag(raw: string): { key: string; value: string } | null {
  const sep = raw.indexOf("=");
  if (sep === -1) return null;
  return { key: raw.substring(0, sep), value: raw.substring(sep + 1) };
}

function buildAuthFromFlags(parsed: ParsedArgs): AuthConfig | null {
  if (hasFlag(parsed.flags, "auth-none")) return { type: "none" };

  const bearer = getFlag(parsed.flags, "auth-bearer");
  if (bearer) return { type: "bearer", token: bearer };

  const basic = getFlag(parsed.flags, "auth-basic");
  if (basic) {
    const sep = basic.indexOf(":");
    if (sep === -1) return { type: "basic", username: basic, password: "" };
    return { type: "basic", username: basic.substring(0, sep), password: basic.substring(sep + 1) };
  }

  const apikey = getFlag(parsed.flags, "auth-apikey");
  if (apikey) {
    const sep = apikey.indexOf("=");
    const key = sep === -1 ? apikey : apikey.substring(0, sep);
    const value = sep === -1 ? "" : apikey.substring(sep + 1);
    const addTo = (getFlag(parsed.flags, "auth-apikey-in") ?? "header") as "header" | "query";
    return { type: "apikey", key, value, addTo };
  }

  return null;
}

function buildBodyFromFlags(parsed: ParsedArgs): RequestBody | null {
  const jsonBody = getFlag(parsed.flags, "body-json");
  if (jsonBody) return { type: "json", content: jsonBody };

  const rawBody = getFlag(parsed.flags, "body-raw");
  if (rawBody) {
    const contentType = getFlag(parsed.flags, "body-content-type") ?? "text/plain";
    return { type: "raw", content: rawBody, contentType };
  }

  if (hasFlag(parsed.flags, "body-none")) return { type: "none" };

  return null;
}

export async function handleRequest(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const folderId = getFlag(parsed.flags, "folder");
      const requests = await data.getRequests();
      const filtered = [...requests.values()].filter((r) => {
        if (r.collectionId !== collectionId) return false;
        if (folderId !== undefined) return r.parentFolderId === folderId;
        return true;
      });

      const summary = filtered.map((r) => ({
        id: r.id,
        name: r.name,
        method: r.method,
        url: r.url,
        parentFolderId: r.parentFolderId,
      }));
      printList(summary);
      break;
    }

    case "get": {
      const id = parsed.args[0];
      const request = await data.getRequest(id);
      if (!request) return printError(`Request not found: ${id}`, "NOT_FOUND");

      const masked = maskRequest(request, parsed.showSecrets);
      const fields = getFlag(parsed.flags, "fields");
      printResult(fields ? pickFields(masked as unknown as Record<string, unknown>, fields) : masked);
      break;
    }

    case "create": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const name = getFlag(parsed.flags, "name");
      const method = getFlag(parsed.flags, "method")?.toUpperCase();
      if (method && !VALID_METHODS.has(method))
        return printError(`Invalid method: ${method}`, "INVALID_PARAM");

      const url = getFlag(parsed.flags, "url");
      const parentId = getFlag(parsed.flags, "parent");

      const request = await data.createRequest(collectionId, name, method, url, parentId);
      printResult(request);
      break;
    }

    case "update": {
      const id = parsed.args[0];
      const current = await data.getRequest(id);
      if (!current) return printError(`Request not found: ${id}`, "NOT_FOUND");

      const patch: Partial<RequestConfig> = {};

      const name = getFlag(parsed.flags, "name");
      if (name) patch.name = name;

      const docs = getFlag(parsed.flags, "docs");
      const docsFile = getFlag(parsed.flags, "docs-file");
      if (docsFile) {
        const { readFileSync } = await import("node:fs");
        patch.docs = readFileSync(docsFile, "utf-8");
      } else if (docs) {
        patch.docs = docs;
      }

      const method = getFlag(parsed.flags, "method")?.toUpperCase();
      if (method) {
        if (!VALID_METHODS.has(method))
          return printError(`Invalid method: ${method}`, "INVALID_PARAM");
        patch.method = method as HttpMethod;
      }

      const url = getFlag(parsed.flags, "url");
      if (url) patch.url = url;

      const headerFlags = getAllFlags(parsed.flags, "set-header");
      if (headerFlags.length > 0) {
        const newHeaders = [...current.headers];
        for (const raw of headerFlags) {
          const h = parseHeaderFlag(raw);
          if (!h) return printError(`Invalid header format: ${raw}. Use "Key: Value"`, "INVALID_PARAM");
          const existing = newHeaders.findIndex(
            (e) => e.key.toLowerCase() === h.key.toLowerCase(),
          );
          if (existing !== -1) {
            newHeaders[existing] = { ...newHeaders[existing], value: h.value };
          } else {
            newHeaders.push({
              id: crypto.randomUUID(),
              key: h.key,
              value: h.value,
              enabled: true,
            });
          }
        }
        patch.headers = newHeaders;
      }

      const removeHeaders = getAllFlags(parsed.flags, "remove-header");
      if (removeHeaders.length > 0) {
        const headers = patch.headers ?? [...current.headers];
        patch.headers = headers.filter(
          (h) => !removeHeaders.some((r) => r.toLowerCase() === h.key.toLowerCase()),
        );
      }

      const paramFlags = getAllFlags(parsed.flags, "set-param");
      if (paramFlags.length > 0) {
        const newParams = [...current.params];
        for (const raw of paramFlags) {
          const p = parseParamFlag(raw);
          if (!p) return printError(`Invalid param format: ${raw}. Use "key=value"`, "INVALID_PARAM");
          const existing = newParams.findIndex((e) => e.key === p.key);
          if (existing !== -1) {
            newParams[existing] = { ...newParams[existing], value: p.value };
          } else {
            newParams.push({
              id: crypto.randomUUID(),
              key: p.key,
              value: p.value,
              enabled: true,
            });
          }
        }
        patch.params = newParams;
      }

      const removeParams = getAllFlags(parsed.flags, "remove-param");
      if (removeParams.length > 0) {
        const params = patch.params ?? [...current.params];
        patch.params = params.filter((p) => !removeParams.includes(p.key));
      }

      const auth = buildAuthFromFlags(parsed);
      if (auth) patch.auth = auth;

      const body = buildBodyFromFlags(parsed);
      if (body) patch.body = body;

      if (Object.keys(patch).length === 0)
        return printError("No update flags provided", "MISSING_PARAM");

      const updated = await data.updateRequest(id, patch);
      if (!updated) return printError(`Request not found: ${id}`, "NOT_FOUND");

      printResult(maskRequest(updated, parsed.showSecrets));
      break;
    }

    case "delete": {
      const id = parsed.args[0];
      const deleted = await data.deleteRequest(id);
      if (!deleted) return printError(`Request not found: ${id}`, "NOT_FOUND");
      printResult({ deleted: true, id });
      break;
    }
  }
}
