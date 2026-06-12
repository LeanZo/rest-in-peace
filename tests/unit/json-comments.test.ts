import { describe, it, expect } from "vitest";
import { stripJsonComments } from "@/core/services/json-comments";

describe("stripJsonComments", () => {
  it("returns plain JSON unchanged", () => {
    const json = '{"key": "value", "num": 42}';
    expect(stripJsonComments(json)).toBe(json);
  });

  it("strips single-line comments", () => {
    const input = `{
  "name": "test", // this is a comment
  "age": 25
}`;
    const result = stripJsonComments(input);
    expect(result).not.toContain("//");
    expect(result).not.toContain("this is a comment");
    expect(JSON.parse(result)).toEqual({ name: "test", age: 25 });
  });

  it("strips block comments", () => {
    const input = `{
  /* "disabled": true, */
  "enabled": false
}`;
    const result = stripJsonComments(input);
    expect(result).not.toContain("/*");
    expect(result).not.toContain("disabled");
    expect(JSON.parse(result)).toEqual({ enabled: false });
  });

  it("strips multiline block comments", () => {
    const input = `{
  /*
    "a": 1,
    "b": 2,
  */
  "c": 3
}`;
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ c: 3 });
  });

  it("preserves // inside strings", () => {
    const input = '{"url": "https://example.com"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it("preserves /* inside strings", () => {
    const input = '{"pattern": "/* not a comment */"}';
    expect(stripJsonComments(input)).toBe(input);
  });

  it("handles escaped quotes in strings", () => {
    const input = '{"msg": "say \\"hello\\"", // comment\n "ok": true}';
    const result = stripJsonComments(input);
    expect(result).not.toContain("comment");
    expect(JSON.parse(result)).toEqual({ msg: 'say "hello"', ok: true });
  });

  it("handles empty input", () => {
    expect(stripJsonComments("")).toBe("");
  });

  it("handles comment-only input", () => {
    expect(stripJsonComments("// just a comment").trim()).toBe("");
  });

  it("handles mixed comment styles", () => {
    const input = `{
  // line comment
  "a": 1, /* inline block */
  /* "b": 2, */
  "c": 3 // trailing
}`;
    const result = stripJsonComments(input);
    expect(JSON.parse(result)).toEqual({ a: 1, c: 3 });
  });
});
