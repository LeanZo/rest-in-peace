import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { getFlag } from "../main";

export async function handleFolder(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const folders = await data.getFolders();
      const filtered = [...folders.values()].filter(
        (f) => f.collectionId === collectionId,
      );
      const summary = filtered.map((f) => ({
        id: f.id,
        name: f.name,
        parentFolderId: f.parentFolderId,
        itemCount: f.childItemIds.length,
      }));
      printList(summary);
      break;
    }

    case "get": {
      const id = parsed.args[0];
      const folder = await data.getFolder(id);
      if (!folder) return printError(`Folder not found: ${id}`, "NOT_FOUND");

      const fields = getFlag(parsed.flags, "fields");
      if (fields) {
        const keys = fields.split(",").map((f) => f.trim());
        const result: Record<string, unknown> = { id: folder.id };
        const record = folder as unknown as Record<string, unknown>;
        for (const key of keys) {
          if (key in record) result[key] = record[key];
        }
        printResult(result);
      } else {
        printResult(folder);
      }
      break;
    }

    case "create": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const name = getFlag(parsed.flags, "name");
      if (!name) return printError("Missing --name", "MISSING_PARAM");

      const parentId = getFlag(parsed.flags, "parent");
      const folder = await data.createFolder(collectionId, name, parentId);
      printResult(folder);
      break;
    }

    case "update": {
      const id = parsed.args[0];
      const patch: Record<string, string> = {};
      const name = getFlag(parsed.flags, "name");
      const docs = getFlag(parsed.flags, "docs");
      const docsFile = getFlag(parsed.flags, "docs-file");

      if (name) patch.name = name;
      if (docsFile) {
        const { readFileSync } = await import("node:fs");
        patch.docs = readFileSync(docsFile, "utf-8");
      } else if (docs) {
        patch.docs = docs;
      }

      if (Object.keys(patch).length === 0)
        return printError("No update flags provided", "MISSING_PARAM");

      const updated = await data.updateFolder(id, patch);
      if (!updated) return printError(`Folder not found: ${id}`, "NOT_FOUND");

      printResult(updated);
      break;
    }

    case "delete": {
      const id = parsed.args[0];
      const deleted = await data.deleteFolder(id);
      if (!deleted) return printError(`Folder not found: ${id}`, "NOT_FOUND");
      printResult({ deleted: true, id });
      break;
    }
  }
}
