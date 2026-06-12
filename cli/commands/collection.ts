import type { Collection } from "@/core/models/collection";
import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { maskAuth, maskHeaders } from "../secrets";
import { getFlag } from "../main";

function maskCollection(c: Collection, showSecrets: boolean): Collection {
  if (showSecrets) return c;
  return {
    ...c,
    auth: c.auth ? maskAuth(c.auth) : undefined,
    headers: c.headers ? maskHeaders(c.headers) : undefined,
  };
}

function pickFields(data: Record<string, unknown>, fields: string): Record<string, unknown> {
  const keys = fields.split(",").map((f) => f.trim());
  const result: Record<string, unknown> = { id: data.id };
  for (const key of keys) {
    if (key in data) {
      result[key] = data[key];
    }
  }
  return result;
}

export async function handleCollection(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      const collections = await data.getCollections();
      const summary = collections.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        activeEnvironmentId: c.activeEnvironmentId,
        itemCount: c.rootItemIds.length,
      }));
      printList(summary);
      break;
    }

    case "get": {
      const id = parsed.args[0];
      const collection = await data.getCollection(id);
      if (!collection) return printError(`Collection not found: ${id}`, "NOT_FOUND");

      const masked = maskCollection(collection, parsed.showSecrets);
      const fields = getFlag(parsed.flags, "fields");
      printResult(fields ? pickFields(masked as unknown as Record<string, unknown>, fields) : masked);
      break;
    }

    case "create": {
      const name = getFlag(parsed.flags, "name");
      if (!name) return printError("Missing --name", "MISSING_PARAM");

      const description = getFlag(parsed.flags, "description");
      const collection = await data.createCollection(name, description);
      printResult(collection);
      break;
    }

    case "update": {
      const id = parsed.args[0];
      const patch: Record<string, string> = {};
      const name = getFlag(parsed.flags, "name");
      const description = getFlag(parsed.flags, "description");
      const docs = getFlag(parsed.flags, "docs");
      const docsFile = getFlag(parsed.flags, "docs-file");

      if (name) patch.name = name;
      if (description) patch.description = description;
      if (docsFile) {
        const { readFileSync } = await import("node:fs");
        patch.docs = readFileSync(docsFile, "utf-8");
      } else if (docs) {
        patch.docs = docs;
      }

      if (Object.keys(patch).length === 0)
        return printError("No update flags provided", "MISSING_PARAM");

      const updated = await data.updateCollection(id, patch);
      if (!updated) return printError(`Collection not found: ${id}`, "NOT_FOUND");

      printResult(maskCollection(updated, parsed.showSecrets));
      break;
    }

    case "delete": {
      const id = parsed.args[0];
      const deleted = await data.deleteCollection(id);
      if (!deleted) return printError(`Collection not found: ${id}`, "NOT_FOUND");
      printResult({ deleted: true, id });
      break;
    }
  }
}
