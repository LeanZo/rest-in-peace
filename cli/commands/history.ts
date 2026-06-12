import type { HistoryEntry } from "@/core/models/history";
import type { HttpMethod } from "@/core/models/primitives";
import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { maskAuth, maskHeaders, maskHeaderPairs, maskCookies } from "../secrets";
import { getFlag } from "../main";

function maskHistoryEntry(e: HistoryEntry, showSecrets: boolean): HistoryEntry {
  if (showSecrets) return e;
  return {
    ...e,
    resolvedRequest: {
      ...e.resolvedRequest,
      headers: maskHeaderPairs(e.resolvedRequest.headers),
    },
    originalRequest: e.originalRequest
      ? {
          ...e.originalRequest,
          auth: maskAuth(e.originalRequest.auth),
          headers: maskHeaders(e.originalRequest.headers),
        }
      : undefined,
    response: {
      ...e.response,
      headers: maskHeaderPairs(e.response.headers),
      cookies: maskCookies(e.response.cookies),
    },
  };
}

export async function handleHistory(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      let entries = await data.getHistory();

      const collectionId = getFlag(parsed.flags, "collection");
      if (collectionId) {
        entries = entries.filter((e) => e.collectionId === collectionId);
      }

      const requestId = getFlag(parsed.flags, "request");
      if (requestId) {
        entries = entries.filter((e) => e.requestId === requestId);
      }

      const method = getFlag(parsed.flags, "method")?.toUpperCase() as HttpMethod | undefined;
      if (method) {
        entries = entries.filter((e) => e.resolvedRequest.method === method);
      }

      const status = getFlag(parsed.flags, "status");
      if (status) {
        entries = entries.filter((e) => {
          const code = e.response.statusCode;
          switch (status) {
            case "2xx": return code >= 200 && code < 300;
            case "3xx": return code >= 300 && code < 400;
            case "4xx": return code >= 400 && code < 500;
            case "5xx": return code >= 500;
            default: return true;
          }
        });
      }

      entries.sort((a, b) => b.timestamp - a.timestamp);

      const limit = getFlag(parsed.flags, "limit");
      if (limit) entries = entries.slice(0, parseInt(limit, 10));

      const summary = entries.map((e) => ({
        id: e.id,
        requestId: e.requestId,
        method: e.resolvedRequest.method,
        url: e.resolvedRequest.url,
        statusCode: e.response.statusCode,
        timestamp: e.timestamp,
        environmentName: e.environmentName,
      }));
      printList(summary);
      break;
    }

    case "get": {
      const id = parsed.args[0];
      const entry = await data.getHistoryEntry(id);
      if (!entry) return printError(`History entry not found: ${id}`, "NOT_FOUND");

      const masked = maskHistoryEntry(entry, parsed.showSecrets);
      const fields = getFlag(parsed.flags, "fields");
      if (fields) {
        const keys = fields.split(",").map((f) => f.trim());
        const result: Record<string, unknown> = { id: masked.id };
        const record = masked as unknown as Record<string, unknown>;
        for (const key of keys) {
          if (key in record) result[key] = record[key];
        }
        printResult(result);
      } else {
        printResult(masked);
      }
      break;
    }

    case "delete": {
      const id = parsed.args[0];
      const deleted = await data.deleteHistoryEntry(id);
      if (!deleted) return printError(`History entry not found: ${id}`, "NOT_FOUND");
      printResult({ deleted: true, id });
      break;
    }

    case "clear-all": {
      await data.clearAllHistory();
      printResult({ cleared: true, scope: "all" });
      break;
    }

    case "clear-request": {
      const requestId = getFlag(parsed.flags, "history-request");
      if (!requestId) return printError("Missing --history-request <id>", "MISSING_PARAM");
      await data.clearRequestHistory(requestId);
      printResult({ cleared: true, scope: "request", requestId });
      break;
    }
  }
}
