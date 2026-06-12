import type { Environment } from "@/core/models/environment";
import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printList, printError } from "../output";
import { maskEnvironmentVariables } from "../secrets";
import { getFlag, getAllFlags, hasFlag } from "../main";

function maskEnv(env: Environment, showSecrets: boolean): Environment {
  if (showSecrets) return env;
  return { ...env, variables: maskEnvironmentVariables(env.variables) };
}

export async function handleEnvironment(
  action: string,
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  switch (action) {
    case "list": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const environments = await data.getEnvironmentsForCollection(collectionId);
      const summary = environments.map((e) => ({
        id: e.id,
        name: e.name,
        variableCount: e.variables.length,
      }));
      printList(summary);
      break;
    }

    case "list-variables": {
      const envId = getFlag(parsed.flags, "environment");
      if (!envId) return printError("Missing --environment", "MISSING_PARAM");

      const env = await data.getEnvironment(envId);
      if (!env) return printError(`Environment not found: ${envId}`, "NOT_FOUND");

      const variables = parsed.showSecrets
        ? env.variables
        : maskEnvironmentVariables(env.variables);

      const summary = variables.map((v) => ({
        id: v.id,
        name: v.name,
        initialValue: v.initialValue,
        currentValue: v.currentValue,
        isSecret: v.isSecret,
        enabled: v.enabled,
      }));
      printList(summary);
      break;
    }

    case "get": {
      const id = parsed.args[0];
      const env = await data.getEnvironment(id);
      if (!env) return printError(`Environment not found: ${id}`, "NOT_FOUND");

      const masked = maskEnv(env, parsed.showSecrets);
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

    case "create": {
      const collectionId = getFlag(parsed.flags, "collection");
      if (!collectionId) return printError("Missing --collection", "MISSING_PARAM");

      const name = getFlag(parsed.flags, "name");
      if (!name) return printError("Missing --name", "MISSING_PARAM");

      const env = await data.createEnvironment(collectionId, name);
      printResult(env);
      break;
    }

    case "update": {
      const id = parsed.args[0];

      const setVars = getAllFlags(parsed.flags, "set-var");
      const deleteVars = getAllFlags(parsed.flags, "delete-var");
      const isSecret = hasFlag(parsed.flags, "secret");
      const name = getFlag(parsed.flags, "name");

      if (name) {
        const updated = await data.updateEnvironment(id, { name });
        if (!updated) return printError(`Environment not found: ${id}`, "NOT_FOUND");
      }

      for (const raw of setVars) {
        const sep = raw.indexOf("=");
        const varName = sep === -1 ? raw : raw.substring(0, sep);
        const varValue = sep === -1 ? "" : raw.substring(sep + 1);
        const result = await data.setVariable(id, varName, varValue, isSecret);
        if (!result) return printError(`Environment not found: ${id}`, "NOT_FOUND");
      }

      for (const varName of deleteVars) {
        const result = await data.deleteVariable(id, varName);
        if (!result) return printError(`Environment not found: ${id}`, "NOT_FOUND");
      }

      if (!name && setVars.length === 0 && deleteVars.length === 0)
        return printError("No update flags provided", "MISSING_PARAM");

      const env = await data.getEnvironment(id);
      printResult(maskEnv(env!, parsed.showSecrets));
      break;
    }

    case "delete": {
      const id = parsed.args[0];
      const deleted = await data.deleteEnvironment(id);
      if (!deleted) return printError(`Environment not found: ${id}`, "NOT_FOUND");
      printResult({ deleted: true, id });
      break;
    }
  }
}
