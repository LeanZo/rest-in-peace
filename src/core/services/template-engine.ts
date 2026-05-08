import type { EnvironmentVariable } from "@/core/models/environment";
import type { ResolvedVariableMap } from "@/core/models/environment";

const TEMPLATE_REGEX = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const MAX_DEPTH = 10;

export class TemplateCircularReferenceError extends Error {
  constructor(
    public variable: string,
    public chain: string[],
  ) {
    super(
      `Circular variable reference: ${[...chain, variable].join(" -> ")}`,
    );
    this.name = "TemplateCircularReferenceError";
  }
}

export function buildResolvedMap(
  variables: EnvironmentVariable[],
): ResolvedVariableMap {
  const rawMap = new Map<string, string>();
  for (const v of variables) {
    if (v.enabled) {
      rawMap.set(v.name, v.currentValue);
    }
  }

  const resolved = new Map<string, string>();

  function resolve(
    name: string,
    value: string,
    chain: Set<string>,
    depth: number,
  ): string {
    if (resolved.has(name)) return resolved.get(name)!;
    if (chain.has(name)) {
      throw new TemplateCircularReferenceError(name, [...chain]);
    }
    if (depth > MAX_DEPTH) return value;

    chain.add(name);

    const result = value.replace(TEMPLATE_REGEX, (match, refName: string) => {
      if (rawMap.has(refName)) {
        return resolve(refName, rawMap.get(refName)!, new Set(chain), depth + 1);
      }
      return match;
    });

    resolved.set(name, result);
    return result;
  }

  for (const [name, value] of rawMap) {
    resolve(name, value, new Set(), 0);
  }

  return resolved;
}

export function interpolate(
  template: string,
  variables: ResolvedVariableMap,
): string {
  return template.replace(TEMPLATE_REGEX, (match, name: string) => {
    return variables.has(name) ? variables.get(name)! : match;
  });
}

export function findVariables(template: string): string[] {
  const vars: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(TEMPLATE_REGEX.source, "g");
  while ((match = regex.exec(template)) !== null) {
    vars.push(match[1]);
  }
  return vars;
}
