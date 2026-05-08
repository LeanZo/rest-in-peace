import { describe, it, expect } from "vitest";
import {
  buildResolvedMap,
  interpolate,
  findVariables,
  TemplateCircularReferenceError,
} from "@/core/services/template-engine";
import type { EnvironmentVariable } from "@/core/models/environment";

function makeVar(
  name: string,
  value: string,
  enabled = true,
): EnvironmentVariable {
  return {
    id: name,
    name,
    initialValue: value,
    currentValue: value,
    isSecret: false,
    enabled,
  };
}

describe("buildResolvedMap", () => {
  it("resolves simple variables", () => {
    const vars = [makeVar("HOST", "example.com"), makeVar("PORT", "3000")];
    const map = buildResolvedMap(vars);
    expect(map.get("HOST")).toBe("example.com");
    expect(map.get("PORT")).toBe("3000");
  });

  it("resolves nested variable references", () => {
    const vars = [
      makeVar("HOST", "example.com"),
      makeVar("BASE_URL", "https://{{HOST}}/api"),
    ];
    const map = buildResolvedMap(vars);
    expect(map.get("BASE_URL")).toBe("https://example.com/api");
  });

  it("resolves deeply nested references", () => {
    const vars = [
      makeVar("DOMAIN", "example.com"),
      makeVar("HOST", "api.{{DOMAIN}}"),
      makeVar("BASE_URL", "https://{{HOST}}/v1"),
    ];
    const map = buildResolvedMap(vars);
    expect(map.get("BASE_URL")).toBe("https://api.example.com/v1");
  });

  it("leaves unresolved variables as-is", () => {
    const vars = [makeVar("URL", "https://{{UNKNOWN_HOST}}/api")];
    const map = buildResolvedMap(vars);
    expect(map.get("URL")).toBe("https://{{UNKNOWN_HOST}}/api");
  });

  it("ignores disabled variables", () => {
    const vars = [
      makeVar("HOST", "example.com", false),
      makeVar("URL", "https://{{HOST}}/api"),
    ];
    const map = buildResolvedMap(vars);
    expect(map.has("HOST")).toBe(false);
    expect(map.get("URL")).toBe("https://{{HOST}}/api");
  });

  it("throws on circular references", () => {
    const vars = [
      makeVar("A", "{{B}}"),
      makeVar("B", "{{A}}"),
    ];
    expect(() => buildResolvedMap(vars)).toThrow(
      TemplateCircularReferenceError,
    );
  });

  it("handles self-referencing variable", () => {
    const vars = [makeVar("A", "{{A}}")];
    expect(() => buildResolvedMap(vars)).toThrow(
      TemplateCircularReferenceError,
    );
  });

  it("handles diamond dependencies (A->B, A->C, B->D, C->D)", () => {
    const vars = [
      makeVar("D", "value"),
      makeVar("B", "{{D}}-b"),
      makeVar("C", "{{D}}-c"),
      makeVar("A", "{{B}}-{{C}}"),
    ];
    const map = buildResolvedMap(vars);
    expect(map.get("A")).toBe("value-b-value-c");
  });

  it("handles variables with whitespace in braces", () => {
    const vars = [makeVar("HOST", "example.com")];
    const map = buildResolvedMap(vars);
    const result = interpolate("{{ HOST }}", map);
    expect(result).toBe("example.com");
  });
});

describe("interpolate", () => {
  it("replaces known variables", () => {
    const map = new Map([["NAME", "World"]]);
    expect(interpolate("Hello {{NAME}}!", map)).toBe("Hello World!");
  });

  it("replaces multiple occurrences", () => {
    const map = new Map([["X", "1"]]);
    expect(interpolate("{{X}}-{{X}}", map)).toBe("1-1");
  });

  it("leaves unknown variables unchanged", () => {
    const map = new Map<string, string>();
    expect(interpolate("{{MISSING}}", map)).toBe("{{MISSING}}");
  });

  it("handles empty template", () => {
    const map = new Map([["X", "1"]]);
    expect(interpolate("", map)).toBe("");
  });

  it("handles template with no variables", () => {
    const map = new Map([["X", "1"]]);
    expect(interpolate("no vars here", map)).toBe("no vars here");
  });
});

describe("findVariables", () => {
  it("finds all variable names in a template", () => {
    const result = findVariables("{{HOST}}/{{PATH}}?key={{KEY}}");
    expect(result).toEqual(["HOST", "PATH", "KEY"]);
  });

  it("returns empty for no variables", () => {
    expect(findVariables("no variables")).toEqual([]);
  });

  it("handles whitespace in braces", () => {
    const result = findVariables("{{ HOST }}");
    expect(result).toEqual(["HOST"]);
  });
});
