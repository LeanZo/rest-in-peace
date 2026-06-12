import { FileStorageAdapter } from "./storage";
import { DataLayer } from "./data";
import { printError } from "./output";
import { handleCollection } from "./commands/collection";
import { handleFolder } from "./commands/folder";
import { handleRequest } from "./commands/request";
import { handleEnvironment } from "./commands/environment";
import { handleHistory } from "./commands/history";
import { handleCookie } from "./commands/cookie";
import { handleSend } from "./commands/send";
import { handleSkill } from "./commands/skill";
import { printHelp, printCommandHelp } from "./help";

const VERSION = "0.3.2";

export interface ParsedArgs {
  command: string;
  args: string[];
  flags: Record<string, string[]>;
  showSecrets: boolean;
  dataFile: string | null;
}

export function getFlag(
  flags: Record<string, string[]>,
  key: string,
): string | undefined {
  return flags[key]?.[0];
}

export function getAllFlags(
  flags: Record<string, string[]>,
  key: string,
): string[] {
  return flags[key] ?? [];
}

export function hasFlag(
  flags: Record<string, string[]>,
  key: string,
): boolean {
  return key in flags;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: "",
    args: [],
    flags: {},
    showSecrets: false,
    dataFile: null,
  };

  const positional: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--show-secrets") {
      result.showSecrets = true;
      i++;
    } else if (arg === "--data-file" && i + 1 < argv.length) {
      result.dataFile = argv[i + 1];
      i += 2;
    } else if (arg === "--version") {
      console.log(VERSION);
      process.exit(0);
    } else if (arg.startsWith("--")) {
      const key = arg.substring(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        if (!result.flags[key]) result.flags[key] = [];
        result.flags[key].push(argv[i + 1]);
        i += 2;
      } else {
        if (!result.flags[key]) result.flags[key] = [];
        result.flags[key].push("true");
        i++;
      }
    } else {
      positional.push(arg);
      i++;
    }
  }

  result.command = positional[0] ?? "";
  result.args = positional.slice(1);

  return result;
}

function getUserArgs(): string[] {
  // Bun sets argv to [runtime, entrypoint, ...userArgs] both for
  // `bun run cli/main.ts` (entrypoint = the .ts file) and for the compiled
  // binary (entrypoint = rip.exe), so user arguments always start at index 2.
  return process.argv.slice(2);
}

async function routeList(parsed: ParsedArgs, data: DataLayer) {
  const type = parsed.args[0];
  switch (type) {
    case "collections":
      return handleCollection("list", parsed, data);
    case "folders":
      return handleFolder("list", parsed, data);
    case "requests":
      return handleRequest("list", parsed, data);
    case "environments":
      return handleEnvironment("list", parsed, data);
    case "history":
      return handleHistory("list", parsed, data);
    case "cookies":
      return handleCookie("list", parsed, data);
    case "variables":
      return handleEnvironment("list-variables", parsed, data);
    default:
      printError(
        type
          ? `Unknown type: ${type}`
          : "Missing type. Use: collections, folders, requests, environments, history, cookies, variables",
        "INVALID_TYPE",
      );
  }
}

async function routeGet(parsed: ParsedArgs, data: DataLayer) {
  const id = parsed.args[0];
  if (!id) return printError("Missing entity ID", "MISSING_ID");

  const entity = await data.resolveEntity(id);
  if (!entity) return printError(`Entity not found: ${id}`, "NOT_FOUND");

  const routed = { ...parsed, args: [id] };
  switch (entity.type) {
    case "collection":
      return handleCollection("get", routed, data);
    case "folder":
      return handleFolder("get", routed, data);
    case "request":
      return handleRequest("get", routed, data);
    case "environment":
      return handleEnvironment("get", routed, data);
    case "history":
      return handleHistory("get", routed, data);
  }
}

async function routeCreate(parsed: ParsedArgs, data: DataLayer) {
  const type = parsed.args[0];
  switch (type) {
    case "collection":
      return handleCollection("create", parsed, data);
    case "folder":
      return handleFolder("create", parsed, data);
    case "request":
      return handleRequest("create", parsed, data);
    case "environment":
      return handleEnvironment("create", parsed, data);
    default:
      printError(
        type
          ? `Cannot create type: ${type}`
          : "Missing type. Use: collection, folder, request, environment",
        "INVALID_TYPE",
      );
  }
}

async function routeUpdate(parsed: ParsedArgs, data: DataLayer) {
  const id = parsed.args[0];
  if (!id) return printError("Missing entity ID", "MISSING_ID");

  const entity = await data.resolveEntity(id);
  if (!entity) return printError(`Entity not found: ${id}`, "NOT_FOUND");

  const routed = { ...parsed, args: [id] };
  switch (entity.type) {
    case "collection":
      return handleCollection("update", routed, data);
    case "folder":
      return handleFolder("update", routed, data);
    case "request":
      return handleRequest("update", routed, data);
    case "environment":
      return handleEnvironment("update", routed, data);
    default:
      printError(`Cannot update entity of type: ${entity.type}`, "INVALID_OPERATION");
  }
}

async function routeDelete(parsed: ParsedArgs, data: DataLayer) {
  if (hasFlag(parsed.flags, "history-all")) {
    return handleHistory("clear-all", parsed, data);
  }
  if (hasFlag(parsed.flags, "history-request")) {
    return handleHistory("clear-request", parsed, data);
  }
  if (hasFlag(parsed.flags, "cookies")) {
    return handleCookie("clear", parsed, data);
  }

  const id = parsed.args[0];
  if (!id) return printError("Missing entity ID", "MISSING_ID");

  const entity = await data.resolveEntity(id);
  if (!entity) return printError(`Entity not found: ${id}`, "NOT_FOUND");

  const routed = { ...parsed, args: [id] };
  switch (entity.type) {
    case "collection":
      return handleCollection("delete", routed, data);
    case "folder":
      return handleFolder("delete", routed, data);
    case "request":
      return handleRequest("delete", routed, data);
    case "environment":
      return handleEnvironment("delete", routed, data);
    case "history":
      return handleHistory("delete", routed, data);
  }
}

async function main() {
  const rawArgs = getUserArgs();

  if (rawArgs.length === 0) {
    printHelp();
    process.exit(0);
  }

  const parsed = parseArgs(rawArgs);

  if (parsed.command === "help" || parsed.args.includes("--help")) {
    const target =
      parsed.command === "help" ? parsed.args[0] : parsed.command;
    printCommandHelp(target);
    process.exit(0);
  }

  // `skill` shells out to npx and needs no data file, so handle it before the
  // storage/data layer is constructed.
  if (parsed.command === "skill") {
    if (hasFlag(parsed.flags, "help")) {
      printCommandHelp("skill");
      process.exit(0);
    }
    // Forward anything the user typed after `skill` to the installer verbatim
    // (e.g. --yes, -y, --global, -g), so its own flags work through rip.
    const skillIdx = rawArgs.indexOf("skill");
    const passthrough = skillIdx >= 0 ? rawArgs.slice(skillIdx + 1) : [];
    return handleSkill(passthrough);
  }

  const storage = new FileStorageAdapter(parsed.dataFile ?? undefined);
  const data = new DataLayer(storage);

  switch (parsed.command) {
    case "list":
      return routeList(parsed, data);
    case "get":
      return routeGet(parsed, data);
    case "create":
      return routeCreate(parsed, data);
    case "update":
      return routeUpdate(parsed, data);
    case "delete":
      return routeDelete(parsed, data);
    case "send":
      return handleSend(parsed, data);
    default:
      printError(`Unknown command: ${parsed.command}`, "UNKNOWN_COMMAND");
  }
}

import { CliError } from "./output";

// This module is the entry point both when run via `bun run cli/main.ts` and as
// the compiled standalone binary (rip.exe); Bun sets `import.meta.main` to true
// in both cases. When the module is imported by tests it is false, so main()
// does not auto-run there.
if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    if (!(err instanceof CliError)) {
      process.stderr.write(
        JSON.stringify({ error: err.message ?? "Unknown error", code: "INTERNAL_ERROR" }, null, 2) + "\n",
      );
    }
    process.exit(1);
  });
}
