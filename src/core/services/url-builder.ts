import type { KeyValueEntry } from "@/core/models/primitives";

export function buildUrl(
  baseUrl: string,
  params: KeyValueEntry[],
  authQueryParams: Record<string, string> = {},
): string {
  const url = parseUrl(baseUrl);
  if (!url) return baseUrl;

  for (const param of params) {
    if (param.enabled && param.key) {
      url.searchParams.append(param.key, param.value);
    }
  }

  for (const [key, value] of Object.entries(authQueryParams)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function parseUrl(url: string): URL | null {
  try {
    if (!url.match(/^https?:\/\//)) {
      url = "http://" + url;
    }
    return new URL(url);
  } catch {
    return null;
  }
}

export function extractQueryParams(url: string): KeyValueEntry[] {
  const parsed = parseUrl(url);
  if (!parsed) return [];

  const params: KeyValueEntry[] = [];
  parsed.searchParams.forEach((value, key) => {
    params.push({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    });
  });

  return params;
}

export function getUrlWithoutParams(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  parsed.search = "";
  return parsed.toString();
}
