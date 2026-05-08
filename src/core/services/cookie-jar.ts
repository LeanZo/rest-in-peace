import type { CookieData, SameSitePolicy } from "@/core/models/cookie";

export function parseSingleSetCookie(
  header: string,
  requestUrl: string,
): CookieData | null {
  const parts = header.split(";").map((s) => s.trim());
  if (parts.length === 0) return null;

  const nameValue = parts[0];
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex === -1) return null;

  const name = nameValue.substring(0, eqIndex).trim();
  const value = nameValue.substring(eqIndex + 1).trim();
  if (!name) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(requestUrl);
  } catch {
    return null;
  }

  const cookie: CookieData = {
    name,
    value,
    domain: parsedUrl.hostname,
    path: getDefaultPath(parsedUrl.pathname),
    httpOnly: false,
    secure: false,
  };

  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const attrEq = attr.indexOf("=");
    const attrName =
      attrEq === -1
        ? attr.toLowerCase().trim()
        : attr.substring(0, attrEq).toLowerCase().trim();
    const attrValue = attrEq === -1 ? "" : attr.substring(attrEq + 1).trim();

    switch (attrName) {
      case "domain":
        cookie.domain = attrValue.startsWith(".")
          ? attrValue
          : "." + attrValue;
        break;
      case "path":
        cookie.path = attrValue || "/";
        break;
      case "expires": {
        const date = new Date(attrValue);
        if (!isNaN(date.getTime())) {
          cookie.expires = date.toISOString();
        }
        break;
      }
      case "max-age": {
        const seconds = parseInt(attrValue, 10);
        if (!isNaN(seconds)) {
          cookie.expires = new Date(
            Date.now() + seconds * 1000,
          ).toISOString();
        }
        break;
      }
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite":
        cookie.sameSite = parseSameSite(attrValue);
        break;
    }
  }

  return cookie;
}

export function parseSetCookieHeaders(
  headers: Array<{ key: string; value: string }>,
  requestUrl: string,
): CookieData[] {
  const cookies: CookieData[] = [];
  for (const header of headers) {
    if (header.key.toLowerCase() === "set-cookie") {
      const cookie = parseSingleSetCookie(header.value, requestUrl);
      if (cookie) cookies.push(cookie);
    }
  }
  return cookies;
}

export function cookieMatchesUrl(cookie: CookieData, url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const domainMatch =
    cookie.domain === parsed.hostname ||
    (cookie.domain.startsWith(".") &&
      parsed.hostname.endsWith(cookie.domain)) ||
    (cookie.domain.startsWith(".") &&
      parsed.hostname === cookie.domain.substring(1));

  if (!domainMatch) return false;

  const pathMatch = parsed.pathname.startsWith(cookie.path);
  if (!pathMatch) return false;

  if (cookie.secure && parsed.protocol !== "https:") return false;

  if (cookie.expires && new Date(cookie.expires) <= new Date()) return false;

  return true;
}

export function getCookiesForUrl(
  cookies: CookieData[],
  url: string,
): CookieData[] {
  return cookies.filter((c) => cookieMatchesUrl(c, url));
}

export function serializeCookies(cookies: CookieData[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

export function mergeCookies(
  existing: CookieData[],
  incoming: CookieData[],
): CookieData[] {
  const result = [...existing];

  for (const cookie of incoming) {
    const index = result.findIndex(
      (c) => c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path,
    );
    if (index !== -1) {
      result[index] = cookie;
    } else {
      result.push(cookie);
    }
  }

  return result.filter(
    (c) => !c.expires || new Date(c.expires) > new Date(),
  );
}

function getDefaultPath(pathname: string): string {
  const lastSlash = pathname.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return pathname.substring(0, lastSlash);
}

function parseSameSite(value: string): SameSitePolicy {
  switch (value.toLowerCase()) {
    case "strict":
      return "Strict";
    case "none":
      return "None";
    default:
      return "Lax";
  }
}
