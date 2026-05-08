import { describe, it, expect } from "vitest";
import { buildAuth } from "@/core/services/auth-builder";

describe("buildAuth", () => {
  it("returns empty for no auth", () => {
    const result = buildAuth({ type: "none" });
    expect(result.headers).toEqual({});
    expect(result.queryParams).toEqual({});
  });

  it("builds Basic auth header", () => {
    const result = buildAuth({
      type: "basic",
      username: "user",
      password: "pass",
    });
    expect(result.headers["Authorization"]).toBe("Basic " + btoa("user:pass"));
    expect(result.queryParams).toEqual({});
  });

  it("builds Bearer token header", () => {
    const result = buildAuth({
      type: "bearer",
      token: "my-token-123",
    });
    expect(result.headers["Authorization"]).toBe("Bearer my-token-123");
  });

  it("builds Bearer with custom prefix", () => {
    const result = buildAuth({
      type: "bearer",
      token: "my-token",
      prefix: "Token",
    });
    expect(result.headers["Authorization"]).toBe("Token my-token");
  });

  it("builds API key in header", () => {
    const result = buildAuth({
      type: "apikey",
      key: "X-API-Key",
      value: "secret-key",
      addTo: "header",
    });
    expect(result.headers["X-API-Key"]).toBe("secret-key");
    expect(result.queryParams).toEqual({});
  });

  it("builds API key in query params", () => {
    const result = buildAuth({
      type: "apikey",
      key: "api_key",
      value: "secret-key",
      addTo: "query",
    });
    expect(result.headers).toEqual({});
    expect(result.queryParams["api_key"]).toBe("secret-key");
  });
});
