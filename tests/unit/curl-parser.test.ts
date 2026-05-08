import { describe, it, expect } from "vitest";
import { isCurl, parseCurl } from "@/core/services/curl-parser";

describe("isCurl", () => {
  it("detects curl commands", () => {
    expect(isCurl("curl https://api.com")).toBe(true);
    expect(isCurl("  curl -X GET https://api.com")).toBe(true);
    expect(isCurl("CURL https://api.com")).toBe(true);
  });

  it("rejects non-curl text", () => {
    expect(isCurl("https://api.com")).toBe(false);
    expect(isCurl("hello world")).toBe(false);
  });
});

describe("parseCurl", () => {
  it("parses simple GET", () => {
    const result = parseCurl("curl https://api.com/users");
    expect(result).not.toBeNull();
    expect(result!.method).toBe("GET");
    expect(result!.url).toBe("https://api.com/users");
  });

  it("parses explicit method", () => {
    const result = parseCurl("curl -X POST https://api.com/users");
    expect(result!.method).toBe("POST");
  });

  it("parses headers", () => {
    const result = parseCurl(
      `curl -H 'Content-Type: application/json' -H 'Authorization: Bearer tok123' https://api.com`,
    );
    expect(result!.headers).toHaveLength(2);
    expect(result!.headers[0].key).toBe("Content-Type");
    expect(result!.headers[0].value).toBe("application/json");
    expect(result!.headers[1].key).toBe("Authorization");
    expect(result!.headers[1].value).toBe("Bearer tok123");
  });

  it("parses JSON body and infers POST", () => {
    const result = parseCurl(`curl -d '{"name":"test"}' https://api.com`);
    expect(result!.method).toBe("POST");
    expect(result!.body.type).toBe("json");
    if (result!.body.type === "json") {
      expect(result!.body.content).toBe('{"name":"test"}');
    }
  });

  it("parses basic auth", () => {
    const result = parseCurl("curl -u admin:secret https://api.com");
    expect(result!.auth.type).toBe("basic");
    if (result!.auth.type === "basic") {
      expect(result!.auth.username).toBe("admin");
      expect(result!.auth.password).toBe("secret");
    }
  });

  it("parses URL-encoded body with content-type hint", () => {
    const result = parseCurl(
      `curl -H 'Content-Type: application/x-www-form-urlencoded' -d 'foo=bar&baz=qux' https://api.com`,
    );
    expect(result!.body.type).toBe("urlencoded");
    if (result!.body.type === "urlencoded") {
      expect(result!.body.fields).toHaveLength(2);
      expect(result!.body.fields[0].key).toBe("foo");
    }
  });

  it("handles double-quoted strings", () => {
    const result = parseCurl(`curl -H "Accept: text/html" https://api.com`);
    expect(result!.headers[0].key).toBe("Accept");
    expect(result!.headers[0].value).toBe("text/html");
  });

  it("returns null for non-curl input", () => {
    expect(parseCurl("https://api.com")).toBeNull();
  });

  it("skips common flags without args", () => {
    const result = parseCurl("curl --compressed -L -s https://api.com");
    expect(result!.url).toBe("https://api.com");
    expect(result!.method).toBe("GET");
  });

  it("parses CMD-style with caret-escaped quotes", () => {
    const input = `curl ^"https://api.com/users^" ^
  -H ^"Content-Type: application/json^" ^
  -H ^"Authorization: Bearer tok123^"`;
    const result = parseCurl(input);
    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://api.com/users");
    expect(result!.method).toBe("GET");
    expect(result!.headers).toHaveLength(2);
    expect(result!.headers[0].key).toBe("Content-Type");
    expect(result!.headers[0].value).toBe("application/json");
    expect(result!.headers[1].key).toBe("Authorization");
    expect(result!.headers[1].value).toBe("Bearer tok123");
  });

  it("parses CMD-style with line continuations only", () => {
    const input = `curl "https://api.com" ^
  -H "accept: application/json" ^
  -X POST`;
    const result = parseCurl(input);
    expect(result!.url).toBe("https://api.com");
    expect(result!.method).toBe("POST");
    expect(result!.headers[0].key).toBe("accept");
  });

  it("parses bash multi-line with backslash continuations", () => {
    const input = `curl 'https://api.com/data' \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer abc'`;
    const result = parseCurl(input);
    expect(result!.url).toBe("https://api.com/data");
    expect(result!.headers).toHaveLength(2);
    expect(result!.headers[1].key).toBe("authorization");
    expect(result!.headers[1].value).toBe("Bearer abc");
  });

  it("parses CMD-style with caret-escaped ampersands in URL", () => {
    const input = `curl ^"https://api.com?a=1^&b=2^"`;
    const result = parseCurl(input);
    expect(result!.url).toBe("https://api.com?a=1&b=2");
  });
});
