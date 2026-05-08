import { describe, it, expect } from "vitest";
import {
  extractRouteParams,
  syncParamsFromUrl,
  rebuildUrlWithParams,
  tokenizeUrl,
} from "@/core/services/url-parser";

describe("extractRouteParams", () => {
  it("extracts params from path", () => {
    expect(extractRouteParams("https://api.com/users/:userId/posts/:postId")).toEqual([
      "userId",
      "postId",
    ]);
  });

  it("returns empty for no params", () => {
    expect(extractRouteParams("https://api.com/users")).toEqual([]);
  });

  it("ignores query string params", () => {
    expect(extractRouteParams("https://api.com/users?:notAParam=1")).toEqual([]);
  });

  it("handles params with underscores", () => {
    expect(extractRouteParams("/api/:user_id")).toEqual(["user_id"]);
  });
});

describe("syncParamsFromUrl", () => {
  it("parses query params from URL", () => {
    const result = syncParamsFromUrl("https://api.com?foo=bar&baz=qux", []);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("foo");
    expect(result[0].value).toBe("bar");
    expect(result[1].key).toBe("baz");
    expect(result[1].value).toBe("qux");
  });

  it("preserves existing entry IDs when keys match", () => {
    const existing = [
      { id: "existing-1", key: "foo", value: "old", enabled: true },
    ];
    const result = syncParamsFromUrl("https://api.com?foo=new", existing);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("existing-1");
    expect(result[0].value).toBe("new");
  });

  it("keeps disabled params not in URL", () => {
    const existing = [
      { id: "d1", key: "hidden", value: "val", enabled: false },
    ];
    const result = syncParamsFromUrl("https://api.com?foo=bar", existing);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe("d1");
    expect(result[1].enabled).toBe(false);
  });

  it("returns empty for URL without query string", () => {
    const result = syncParamsFromUrl("https://api.com/path", []);
    expect(result).toHaveLength(0);
  });
});

describe("rebuildUrlWithParams", () => {
  it("appends enabled params to URL", () => {
    const params = [
      { id: "1", key: "foo", value: "bar", enabled: true },
      { id: "2", key: "baz", value: "qux", enabled: true },
    ];
    expect(rebuildUrlWithParams("https://api.com", params)).toBe(
      "https://api.com?foo=bar&baz=qux",
    );
  });

  it("strips existing query string before rebuilding", () => {
    const params = [{ id: "1", key: "new", value: "val", enabled: true }];
    expect(rebuildUrlWithParams("https://api.com?old=gone", params)).toBe(
      "https://api.com?new=val",
    );
  });

  it("excludes disabled params", () => {
    const params = [
      { id: "1", key: "keep", value: "yes", enabled: true },
      { id: "2", key: "skip", value: "no", enabled: false },
    ];
    expect(rebuildUrlWithParams("https://api.com", params)).toBe(
      "https://api.com?keep=yes",
    );
  });

  it("returns base URL when no enabled params", () => {
    expect(rebuildUrlWithParams("https://api.com?old=1", [])).toBe("https://api.com");
  });
});

describe("tokenizeUrl", () => {
  it("tokenizes protocol", () => {
    const tokens = tokenizeUrl("https://api.com");
    expect(tokens[0]).toEqual({ type: "protocol", text: "https://" });
  });

  it("tokenizes route params", () => {
    const tokens = tokenizeUrl("https://api.com/users/:id");
    const routeToken = tokens.find((t) => t.type === "routeParam");
    expect(routeToken?.text).toBe(":id");
  });

  it("tokenizes env vars", () => {
    const tokens = tokenizeUrl("{{BASE_URL}}/api");
    const envToken = tokens.find((t) => t.type === "envVar");
    expect(envToken?.text).toBe("{{BASE_URL}}");
  });

  it("tokenizes query keys and values", () => {
    const tokens = tokenizeUrl("https://api.com?key=value");
    const keyToken = tokens.find((t) => t.type === "queryKey");
    const valueToken = tokens.find((t) => t.type === "queryValue");
    expect(keyToken?.text).toBe("key");
    expect(valueToken?.text).toBe("value");
  });
});
