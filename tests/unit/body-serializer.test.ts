import { describe, it, expect } from "vitest";
import {
  serializeBody,
  detectContentType,
  tryFormatJson,
} from "@/core/services/body-serializer";

describe("serializeBody", () => {
  it("returns null for no body", () => {
    const result = serializeBody({ type: "none" });
    expect(result.body).toBeNull();
    expect(result.contentType).toBeNull();
  });

  it("serializes JSON body", () => {
    const result = serializeBody({
      type: "json",
      content: '{"key": "value"}',
    });
    expect(result.body).toBe('{"key": "value"}');
    expect(result.contentType).toBe("application/json");
  });

  it("serializes raw text body", () => {
    const result = serializeBody({
      type: "raw",
      content: "hello world",
      contentType: "text/plain",
    });
    expect(result.body).toBe("hello world");
    expect(result.contentType).toBe("text/plain");
  });

  it("serializes form data body", () => {
    const result = serializeBody({
      type: "formdata",
      fields: [
        { id: "1", key: "name", value: "John", fieldType: "text", enabled: true },
        { id: "2", key: "disabled", value: "skip", fieldType: "text", enabled: false },
      ],
    });
    expect(result.body).toBeInstanceOf(FormData);
    expect(result.contentType).toBeNull();
    const fd = result.body as FormData;
    expect(fd.get("name")).toBe("John");
    expect(fd.has("disabled")).toBe(false);
  });

  it("serializes url-encoded body", () => {
    const result = serializeBody({
      type: "urlencoded",
      fields: [
        { id: "1", key: "email", value: "test@example.com", enabled: true },
        { id: "2", key: "pass", value: "s3cret", enabled: true },
      ],
    });
    expect(result.contentType).toBe("application/x-www-form-urlencoded");
    expect(result.body).toContain("email=test%40example.com");
    expect(result.body).toContain("pass=s3cret");
  });

  it("serializes GraphQL body", () => {
    const result = serializeBody({
      type: "graphql",
      query: "{ users { id name } }",
      variables: '{"limit": 10}',
    });
    expect(result.contentType).toBe("application/json");
    const parsed = JSON.parse(result.body as string);
    expect(parsed.query).toBe("{ users { id name } }");
    expect(parsed.variables).toEqual({ limit: 10 });
  });

  it("handles invalid GraphQL variables JSON", () => {
    const result = serializeBody({
      type: "graphql",
      query: "{ users { id } }",
      variables: "not json",
    });
    const parsed = JSON.parse(result.body as string);
    expect(parsed.variables).toEqual({});
  });
});

describe("detectContentType", () => {
  it("detects JSON", () => {
    expect(detectContentType('{"key": "value"}')).toBe("application/json");
    expect(detectContentType("[1, 2, 3]")).toBe("application/json");
  });

  it("detects HTML", () => {
    expect(detectContentType("<!DOCTYPE html><html></html>")).toBe("text/html");
    expect(detectContentType("<html><body></body></html>")).toBe("text/html");
  });

  it("detects XML", () => {
    expect(detectContentType("<root><item/></root>")).toBe("application/xml");
  });

  it("falls back to text/plain", () => {
    expect(detectContentType("hello world")).toBe("text/plain");
  });
});

describe("tryFormatJson", () => {
  it("formats valid JSON", () => {
    const result = tryFormatJson('{"a":1,"b":2}');
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("returns input for invalid JSON", () => {
    expect(tryFormatJson("not json")).toBe("not json");
  });
});
