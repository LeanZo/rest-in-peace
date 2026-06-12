import type { AuthConfig } from "@/core/models/request";
import type { KeyValueEntry } from "@/core/models/primitives";
import type { EnvironmentVariable } from "@/core/models/environment";
import type { CookieData } from "@/core/models/cookie";

const MASK = "*****";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

export function maskAuth(auth: AuthConfig): AuthConfig {
  switch (auth.type) {
    case "basic":
      return { ...auth, password: MASK };
    case "bearer":
      return { ...auth, token: MASK };
    case "apikey":
      return { ...auth, value: MASK };
    case "none":
      return auth;
  }
}

export function maskHeaders(headers: KeyValueEntry[]): KeyValueEntry[] {
  return headers.map((h) =>
    SENSITIVE_HEADERS.has(h.key.toLowerCase()) ? { ...h, value: MASK } : h,
  );
}

export function maskHeaderPairs(
  headers: Array<{ key: string; value: string }>,
): Array<{ key: string; value: string }> {
  return headers.map((h) =>
    SENSITIVE_HEADERS.has(h.key.toLowerCase()) ? { ...h, value: MASK } : h,
  );
}

export function maskEnvironmentVariables(
  variables: EnvironmentVariable[],
): EnvironmentVariable[] {
  return variables.map((v) =>
    v.isSecret ? { ...v, initialValue: MASK, currentValue: MASK } : v,
  );
}

export function maskCookies(cookies: CookieData[]): CookieData[] {
  return cookies.map((c) => ({ ...c, value: MASK }));
}

export function isSensitiveHeader(key: string): boolean {
  return SENSITIVE_HEADERS.has(key.toLowerCase());
}
