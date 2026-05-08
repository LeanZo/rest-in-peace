import type { KeyValueEntry } from "@/core/models/primitives";
import { generateId } from "@/lib/id";

export function extractRouteParams(url: string): string[] {
  const qIdx = findQueryStart(url);
  const pathPart = qIdx >= 0 ? url.slice(0, qIdx) : url;
  const params: string[] = [];
  const regex = /(?:^|\/):([a-zA-Z_]\w*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(pathPart)) !== null) {
    params.push(m[1]);
  }
  return params;
}

export function syncParamsFromUrl(
  url: string,
  existingParams: KeyValueEntry[],
): KeyValueEntry[] {
  const qIdx = findQueryStart(url);
  if (qIdx < 0) {
    return existingParams.filter((p) => !p.enabled ? true : false);
  }

  const queryString = url.slice(qIdx + 1);
  const parsed = parseQueryString(queryString);
  const result: KeyValueEntry[] = [];

  const pool = new Map<string, KeyValueEntry[]>();
  for (const p of existingParams) {
    if (!pool.has(p.key)) pool.set(p.key, []);
    pool.get(p.key)!.push(p);
  }

  for (const { key, value } of parsed) {
    const candidates = pool.get(key);
    if (candidates && candidates.length > 0) {
      const match = candidates.shift()!;
      result.push({ ...match, key, value, enabled: true });
    } else {
      result.push({ id: generateId(), key, value, enabled: true });
    }
  }

  for (const p of existingParams) {
    if (!p.enabled && !result.some((r) => r.id === p.id)) {
      result.push(p);
    }
  }

  return result;
}

export function rebuildUrlWithParams(
  url: string,
  params: KeyValueEntry[],
): string {
  const qIdx = findQueryStart(url);
  const baseUrl = qIdx >= 0 ? url.slice(0, qIdx) : url;

  const enabled = params.filter((p) => p.enabled && (p.key || p.value));
  if (enabled.length === 0) return baseUrl;

  const qs = enabled
    .map((p) => {
      const k = encodeURIComponent(p.key);
      const v = encodeURIComponent(p.value);
      return p.value ? `${k}=${v}` : k;
    })
    .join("&");

  return `${baseUrl}?${qs}`;
}

function findQueryStart(url: string): number {
  let depth = 0;
  for (let i = 0; i < url.length; i++) {
    if (url[i] === "{" && url[i + 1] === "{") {
      depth++;
      i++;
    } else if (url[i] === "}" && url[i + 1] === "}") {
      depth--;
      i++;
    } else if (url[i] === "?" && depth === 0) {
      return i;
    }
  }
  return -1;
}

function parseQueryString(qs: string): { key: string; value: string }[] {
  if (!qs) return [];
  const pairs: { key: string; value: string }[] = [];
  for (const segment of qs.split("&")) {
    if (!segment) continue;
    const eqIdx = segment.indexOf("=");
    if (eqIdx >= 0) {
      pairs.push({
        key: safeDecodeURI(segment.slice(0, eqIdx)),
        value: safeDecodeURI(segment.slice(eqIdx + 1)),
      });
    } else {
      pairs.push({ key: safeDecodeURI(segment), value: "" });
    }
  }
  return pairs;
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type TokenType =
  | "protocol"
  | "path"
  | "routeParam"
  | "separator"
  | "queryKey"
  | "queryValue"
  | "envVar";

export interface UrlToken {
  type: TokenType;
  text: string;
}

export function tokenizeUrl(url: string): UrlToken[] {
  const tokens: UrlToken[] = [];
  const qIdx = findQueryStart(url);
  const pathPart = qIdx >= 0 ? url.slice(0, qIdx) : url;
  const queryPart = qIdx >= 0 ? url.slice(qIdx) : "";

  const pathPattern = /(\{\{[^}]*?\}\})|(https?:\/\/)|(:[a-zA-Z_]\w*)|([^:{]+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = pathPattern.exec(pathPart)) !== null) {
    if (m[1]) tokens.push({ type: "envVar", text: m[1] });
    else if (m[2]) tokens.push({ type: "protocol", text: m[2] });
    else if (m[3]) tokens.push({ type: "routeParam", text: m[3] });
    else if (m[4]) tokens.push({ type: "path", text: m[4] });
  }

  if (queryPart) {
    const qPattern = /(\{\{[^}]*?\}\})|([?&])|(=)|([^?&={}]+)/g;
    let inKey = true;
    while ((m = qPattern.exec(queryPart)) !== null) {
      if (m[1]) {
        tokens.push({ type: "envVar", text: m[1] });
      } else if (m[2]) {
        tokens.push({ type: "separator", text: m[2] });
        inKey = true;
      } else if (m[3]) {
        tokens.push({ type: "separator", text: "=" });
        inKey = false;
      } else if (m[4]) {
        tokens.push({ type: inKey ? "queryKey" : "queryValue", text: m[4] });
      }
    }
  }

  return tokens;
}

export const TOKEN_COLORS: Record<TokenType, string> = {
  protocol: "text-text-muted",
  path: "text-text-primary",
  routeParam: "text-orange-400",
  separator: "text-text-muted",
  queryKey: "text-purple-400",
  queryValue: "text-cyan-400",
  envVar: "text-green-400",
};
