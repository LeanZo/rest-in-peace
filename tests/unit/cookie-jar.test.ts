import { describe, it, expect } from "vitest";
import {
  parseSingleSetCookie,
  parseSetCookieHeaders,
  cookieMatchesUrl,
  getCookiesForUrl,
  serializeCookies,
  mergeCookies,
} from "@/core/services/cookie-jar";
import type { CookieData } from "@/core/models/cookie";

describe("parseSingleSetCookie", () => {
  it("parses a simple cookie", () => {
    const cookie = parseSingleSetCookie(
      "session=abc123",
      "https://example.com/login",
    );
    expect(cookie).not.toBeNull();
    expect(cookie!.name).toBe("session");
    expect(cookie!.value).toBe("abc123");
    expect(cookie!.domain).toBe("example.com");
  });

  it("parses cookie with all attributes", () => {
    const cookie = parseSingleSetCookie(
      "token=xyz; Domain=.example.com; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=3600",
      "https://example.com/api/login",
    );
    expect(cookie).not.toBeNull();
    expect(cookie!.name).toBe("token");
    expect(cookie!.value).toBe("xyz");
    expect(cookie!.domain).toBe(".example.com");
    expect(cookie!.path).toBe("/api");
    expect(cookie!.httpOnly).toBe(true);
    expect(cookie!.secure).toBe(true);
    expect(cookie!.sameSite).toBe("Strict");
    expect(cookie!.expires).toBeDefined();
  });

  it("parses Expires attribute", () => {
    const cookie = parseSingleSetCookie(
      "id=123; Expires=Wed, 09 Jun 2027 10:18:14 GMT",
      "https://example.com",
    );
    expect(cookie!.expires).toBeDefined();
  });

  it("returns null for invalid header", () => {
    expect(parseSingleSetCookie("", "https://example.com")).toBeNull();
    expect(parseSingleSetCookie("noequals", "https://example.com")).toBeNull();
  });

  it("defaults path to directory of request URL", () => {
    const cookie = parseSingleSetCookie(
      "id=1",
      "https://example.com/api/v1/users",
    );
    expect(cookie!.path).toBe("/api/v1");
  });
});

describe("parseSetCookieHeaders", () => {
  it("extracts cookies from response headers", () => {
    const headers = [
      { key: "set-cookie", value: "a=1" },
      { key: "content-type", value: "text/html" },
      { key: "Set-Cookie", value: "b=2" },
    ];
    const cookies = parseSetCookieHeaders(headers, "https://example.com");
    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe("a");
    expect(cookies[1].name).toBe("b");
  });
});

describe("cookieMatchesUrl", () => {
  const baseCookie: CookieData = {
    name: "test",
    value: "1",
    domain: ".example.com",
    path: "/",
    httpOnly: false,
    secure: false,
  };

  it("matches exact domain with dot prefix", () => {
    expect(cookieMatchesUrl(baseCookie, "https://example.com/path")).toBe(true);
  });

  it("matches subdomain", () => {
    expect(cookieMatchesUrl(baseCookie, "https://api.example.com/path")).toBe(true);
  });

  it("rejects different domain", () => {
    expect(cookieMatchesUrl(baseCookie, "https://other.com/path")).toBe(false);
  });

  it("rejects wrong path", () => {
    const cookie = { ...baseCookie, path: "/api" };
    expect(cookieMatchesUrl(cookie, "https://example.com/other")).toBe(false);
    expect(cookieMatchesUrl(cookie, "https://example.com/api/users")).toBe(true);
  });

  it("rejects secure cookie on http", () => {
    const cookie = { ...baseCookie, secure: true };
    expect(cookieMatchesUrl(cookie, "http://example.com")).toBe(false);
    expect(cookieMatchesUrl(cookie, "https://example.com")).toBe(true);
  });

  it("rejects expired cookie", () => {
    const cookie = {
      ...baseCookie,
      expires: new Date(Date.now() - 10000).toISOString(),
    };
    expect(cookieMatchesUrl(cookie, "https://example.com")).toBe(false);
  });
});

describe("getCookiesForUrl", () => {
  it("returns only matching cookies", () => {
    const cookies: CookieData[] = [
      { name: "a", value: "1", domain: ".example.com", path: "/", httpOnly: false, secure: false },
      { name: "b", value: "2", domain: ".other.com", path: "/", httpOnly: false, secure: false },
    ];
    const result = getCookiesForUrl(cookies, "https://example.com/api");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a");
  });
});

describe("serializeCookies", () => {
  it("serializes cookies into Cookie header format", () => {
    const cookies: CookieData[] = [
      { name: "a", value: "1", domain: "x", path: "/", httpOnly: false, secure: false },
      { name: "b", value: "2", domain: "x", path: "/", httpOnly: false, secure: false },
    ];
    expect(serializeCookies(cookies)).toBe("a=1; b=2");
  });
});

describe("mergeCookies", () => {
  it("adds new cookies", () => {
    const existing: CookieData[] = [
      { name: "a", value: "1", domain: ".x.com", path: "/", httpOnly: false, secure: false },
    ];
    const incoming: CookieData[] = [
      { name: "b", value: "2", domain: ".x.com", path: "/", httpOnly: false, secure: false },
    ];
    const result = mergeCookies(existing, incoming);
    expect(result).toHaveLength(2);
  });

  it("updates existing cookies by name+domain+path", () => {
    const existing: CookieData[] = [
      { name: "a", value: "old", domain: ".x.com", path: "/", httpOnly: false, secure: false },
    ];
    const incoming: CookieData[] = [
      { name: "a", value: "new", domain: ".x.com", path: "/", httpOnly: false, secure: false },
    ];
    const result = mergeCookies(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("new");
  });

  it("removes expired cookies after merge", () => {
    const existing: CookieData[] = [];
    const incoming: CookieData[] = [
      {
        name: "expired",
        value: "x",
        domain: ".x.com",
        path: "/",
        expires: new Date(Date.now() - 1000).toISOString(),
        httpOnly: false,
        secure: false,
      },
    ];
    const result = mergeCookies(existing, incoming);
    expect(result).toHaveLength(0);
  });
});
