import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { maskCookies } from "../secrets";
import { getFlag } from "../main";

export async function handleCookie(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const cookies = await data.getCookiesForCollection(collectionId);
      const masked = parsed.showSecrets ? cookies : maskCookies(cookies);
      printList(masked);
      break;
    }

    case "clear": {
      const collectionId = getFlag(parsed.flags, "cookies");
      if (!collectionId) return printError("Missing --cookies <collection-id>", "MISSING_PARAM");

      await data.clearCookies(collectionId);
      printResult({ cleared: true, collectionId });
      break;
    }
  }
}
