import type { RequestConfig } from "@/core/models/request";

export function buildCurl(request: RequestConfig): string {
  const parts: string[] = ["curl"];

  if (request.method !== "GET") {
    parts.push(`-X ${request.method}`);
  }

  parts.push(shellQuote(request.url));

  for (const h of request.headers) {
    if (!h.enabled || !h.key) continue;
    parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
  }

  if (request.auth.type === "bearer") {
    const prefix = request.auth.prefix ?? "Bearer";
    parts.push(`-H ${shellQuote(`Authorization: ${prefix} ${request.auth.token}`)}`);
  } else if (request.auth.type === "basic") {
    parts.push(`-u ${shellQuote(`${request.auth.username}:${request.auth.password}`)}`);
  } else if (request.auth.type === "apikey" && request.auth.addTo === "header") {
    parts.push(`-H ${shellQuote(`${request.auth.key}: ${request.auth.value}`)}`);
  }

  const body = request.body;
  if (body.type === "json") {
    parts.push(`-H ${shellQuote("Content-Type: application/json")}`);
    parts.push(`-d ${shellQuote(body.content)}`);
  } else if (body.type === "raw") {
    if (body.contentType) {
      parts.push(`-H ${shellQuote(`Content-Type: ${body.contentType}`)}`);
    }
    parts.push(`-d ${shellQuote(body.content)}`);
  } else if (body.type === "urlencoded") {
    parts.push(`-H ${shellQuote("Content-Type: application/x-www-form-urlencoded")}`);
    const encoded = body.fields
      .filter((f) => f.enabled)
      .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join("&");
    parts.push(`-d ${shellQuote(encoded)}`);
  } else if (body.type === "graphql") {
    parts.push(`-H ${shellQuote("Content-Type: application/json")}`);
    const gqlBody = JSON.stringify({
      query: body.query,
      variables: body.variables ? JSON.parse(body.variables) : undefined,
    });
    parts.push(`-d ${shellQuote(gqlBody)}`);
  }

  return parts.join(" \\\n  ");
}

export function buildCurlFromHistory(entry: {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string | null;
}): string {
  const parts: string[] = ["curl"];

  if (entry.method !== "GET") {
    parts.push(`-X ${entry.method}`);
  }

  parts.push(shellQuote(entry.url));

  for (const h of entry.headers) {
    parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
  }

  if (entry.body) {
    parts.push(`-d ${shellQuote(entry.body)}`);
  }

  return parts.join(" \\\n  ");
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9._\-/:=@]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}
