import { describe, it, expect } from "vitest";
import {
  buildUrl,
  parseUrl,
  extractQueryParams,
  getUrlWithoutParams,
} from "@/core/services/url-builder";

describe("buildUrl", () => {
  it("appends query params to URL", () => {
    const result = buildUrl("https://api.example.com/users", [
      { id: "1", key: "page", value: "1", enabled: true },
      { id: "2", key: "limit", value: "10", enabled: true },
    ]);
    const url = new URL(result);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("skips disabled params", () => {
    const result = buildUrl("https://api.example.com", [
      { id: "1", key: "active", value: "true", enabled: true },
      { id: "2", key: "skip", value: "me", enabled: false },
    ]);
    const url = new URL(result);
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.has("skip")).toBe(false);
  });

  it("skips params with empty key", () => {
    const result = buildUrl("https://api.example.com", [
      { id: "1", key: "", value: "empty", enabled: true },
    ]);
    const url = new URL(result);
    expect(url.search).toBe("");
  });

  it("merges auth query params", () => {
    const result = buildUrl(
      "https://api.example.com",
      [],
      { api_key: "secret" },
    );
    const url = new URL(result);
    expect(url.searchParams.get("api_key")).toBe("secret");
  });

  it("uses params array as source of truth, ignoring URL query string", () => {
    const result = buildUrl("https://api.example.com?existing=true", [
      { id: "1", key: "added", value: "yes", enabled: true },
    ]);
    const url = new URL(result);
    expect(url.searchParams.has("existing")).toBe(false);
    expect(url.searchParams.get("added")).toBe("yes");
  });
});

describe("parseUrl", () => {
  it("parses a valid URL", () => {
    const url = parseUrl("https://example.com/path");
    expect(url).not.toBeNull();
    expect(url!.hostname).toBe("example.com");
  });

  it("auto-prepends http:// if missing", () => {
    const url = parseUrl("example.com/path");
    expect(url).not.toBeNull();
    expect(url!.protocol).toBe("http:");
  });

  it("returns null for empty string", () => {
    expect(parseUrl("")).toBeNull();
  });
});

describe("extractQueryParams", () => {
  it("extracts query params from URL", () => {
    const params = extractQueryParams(
      "https://example.com?foo=bar&baz=qux",
    );
    expect(params).toHaveLength(2);
    expect(params[0].key).toBe("foo");
    expect(params[0].value).toBe("bar");
    expect(params[1].key).toBe("baz");
    expect(params[1].value).toBe("qux");
  });

  it("returns empty for URL without params", () => {
    expect(extractQueryParams("https://example.com")).toHaveLength(0);
  });
});

describe("getUrlWithoutParams", () => {
  it("removes query params", () => {
    const result = getUrlWithoutParams("https://example.com/path?foo=bar");
    expect(result).toBe("https://example.com/path");
  });
});
