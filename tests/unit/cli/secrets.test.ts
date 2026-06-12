import { describe, it, expect } from "vitest";
import {
  maskAuth,
  maskHeaders,
  maskHeaderPairs,
  maskEnvironmentVariables,
  maskCookies,
  isSensitiveHeader,
} from "../../../cli/secrets";

describe("maskAuth", () => {
  it("masks basic auth password", () => {
    const result = maskAuth({ type: "basic", username: "user", password: "secret" });
    expect(result).toEqual({ type: "basic", username: "user", password: "*****" });
  });

  it("masks bearer auth token", () => {
    const result = maskAuth({ type: "bearer", token: "my-token" });
    expect(result).toEqual({ type: "bearer", token: "*****" });
  });

  it("masks apikey auth value", () => {
    const result = maskAuth({ type: "apikey", key: "X-Api-Key", value: "secret", addTo: "header" });
    expect(result).toEqual({ type: "apikey", key: "X-Api-Key", value: "*****", addTo: "header" });
  });

  it("returns none auth unchanged", () => {
    const result = maskAuth({ type: "none" });
    expect(result).toEqual({ type: "none" });
  });

  it("preserves bearer prefix", () => {
    const result = maskAuth({ type: "bearer", token: "tok", prefix: "Token" });
    expect(result).toEqual({ type: "bearer", token: "*****", prefix: "Token" });
  });
});

describe("maskHeaders", () => {
  it("masks authorization header", () => {
    const headers = [
      { id: "1", key: "Authorization", value: "Bearer token", enabled: true },
      { id: "2", key: "Content-Type", value: "application/json", enabled: true },
    ];
    const result = maskHeaders(headers);
    expect(result[0].value).toBe("*****");
    expect(result[1].value).toBe("application/json");
  });

  it("masks case-insensitively", () => {
    const headers = [
      { id: "1", key: "authorization", value: "secret", enabled: true },
      { id: "2", key: "X-API-KEY", value: "secret", enabled: true },
    ];
    const result = maskHeaders(headers);
    expect(result[0].value).toBe("*****");
    expect(result[1].value).toBe("*****");
  });

  it("masks proxy-authorization, cookie, set-cookie", () => {
    const headers = [
      { id: "1", key: "Proxy-Authorization", value: "Basic abc", enabled: true },
      { id: "2", key: "Cookie", value: "session=abc", enabled: true },
      { id: "3", key: "Set-Cookie", value: "id=xyz", enabled: true },
    ];
    const result = maskHeaders(headers);
    expect(result.every((h) => h.value === "*****")).toBe(true);
  });
});

describe("maskHeaderPairs", () => {
  it("masks sensitive header pairs", () => {
    const headers = [
      { key: "Authorization", value: "Bearer token" },
      { key: "Accept", value: "text/html" },
    ];
    const result = maskHeaderPairs(headers);
    expect(result[0].value).toBe("*****");
    expect(result[1].value).toBe("text/html");
  });
});

describe("maskEnvironmentVariables", () => {
  it("masks secret variables", () => {
    const vars = [
      { id: "1", name: "PUBLIC", initialValue: "visible", currentValue: "visible", isSecret: false, enabled: true },
      { id: "2", name: "SECRET", initialValue: "hidden", currentValue: "hidden", isSecret: true, enabled: true },
    ];
    const result = maskEnvironmentVariables(vars);
    expect(result[0].initialValue).toBe("visible");
    expect(result[0].currentValue).toBe("visible");
    expect(result[1].initialValue).toBe("*****");
    expect(result[1].currentValue).toBe("*****");
  });

  it("preserves non-secret variables", () => {
    const vars = [
      { id: "1", name: "VAR", initialValue: "val", currentValue: "val", isSecret: false, enabled: true },
    ];
    const result = maskEnvironmentVariables(vars);
    expect(result[0].initialValue).toBe("val");
  });
});

describe("maskCookies", () => {
  it("masks all cookie values", () => {
    const cookies = [
      { name: "session", value: "abc123", domain: "example.com", path: "/", httpOnly: true, secure: true },
      { name: "pref", value: "dark", domain: "example.com", path: "/", httpOnly: false, secure: false },
    ];
    const result = maskCookies(cookies);
    expect(result[0].value).toBe("*****");
    expect(result[1].value).toBe("*****");
    expect(result[0].name).toBe("session");
  });
});

describe("isSensitiveHeader", () => {
  it("detects sensitive headers", () => {
    expect(isSensitiveHeader("Authorization")).toBe(true);
    expect(isSensitiveHeader("authorization")).toBe(true);
    expect(isSensitiveHeader("X-Api-Key")).toBe(true);
    expect(isSensitiveHeader("Cookie")).toBe(true);
    expect(isSensitiveHeader("Set-Cookie")).toBe(true);
    expect(isSensitiveHeader("Proxy-Authorization")).toBe(true);
  });

  it("passes non-sensitive headers", () => {
    expect(isSensitiveHeader("Content-Type")).toBe(false);
    expect(isSensitiveHeader("Accept")).toBe(false);
    expect(isSensitiveHeader("User-Agent")).toBe(false);
  });
});
