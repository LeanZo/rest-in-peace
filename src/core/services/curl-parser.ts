import type { HttpMethod, KeyValueEntry } from "@/core/models/primitives";
import type { RequestBody, AuthConfig } from "@/core/models/request";
import { generateId } from "@/lib/id";

export interface ParsedCurl {
  method: HttpMethod;
  url: string;
  headers: KeyValueEntry[];
  body: RequestBody;
  auth: AuthConfig;
}

export function isCurl(text: string): boolean {
  return text.trimStart().toLowerCase().startsWith("curl");
}

export function parseCurl(input: string): ParsedCurl | null {
  const tokens = tokenize(normalizeCurl(input.trim()));
  if (tokens.length === 0 || tokens[0].toLowerCase() !== "curl") return null;

  let method: HttpMethod = "GET";
  let url = "";
  const headers: { key: string; value: string }[] = [];
  let dataRaw = "";
  let basicAuth: { username: string; password: string } | null = null;
  let methodExplicit = false;

  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];

    if (t === "-X" || t === "--request") {
      const val = tokens[++i];
      if (val) {
        method = val.toUpperCase() as HttpMethod;
        methodExplicit = true;
      }
    } else if (t === "-H" || t === "--header") {
      const hdr = tokens[++i];
      if (hdr) {
        const colonIdx = hdr.indexOf(":");
        if (colonIdx > 0) {
          headers.push({
            key: hdr.slice(0, colonIdx).trim(),
            value: hdr.slice(colonIdx + 1).trim(),
          });
        }
      }
    } else if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-ascii"
    ) {
      dataRaw = tokens[++i] || "";
    } else if (t === "-u" || t === "--user") {
      const cred = tokens[++i] || "";
      const colonIdx = cred.indexOf(":");
      basicAuth =
        colonIdx > 0
          ? { username: cred.slice(0, colonIdx), password: cred.slice(colonIdx + 1) }
          : { username: cred, password: "" };
    } else if (t === "--compressed" || t === "-k" || t === "--insecure" || t === "-L" || t === "--location" || t === "-v" || t === "--verbose" || t === "-s" || t === "--silent") {
      // skip known flags with no argument
    } else if (!t.startsWith("-") && !url) {
      url = t;
    }
    i++;
  }

  if (dataRaw && !methodExplicit) method = "POST";

  let body: RequestBody = { type: "none" };
  if (dataRaw) {
    const contentType = headers
      .find((h) => h.key.toLowerCase() === "content-type")
      ?.value.toLowerCase();

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const fields: KeyValueEntry[] = dataRaw.split("&").map((pair) => {
        const eq = pair.indexOf("=");
        return {
          id: generateId(),
          key: eq >= 0 ? decodeURIComponent(pair.slice(0, eq)) : pair,
          value: eq >= 0 ? decodeURIComponent(pair.slice(eq + 1)) : "",
          enabled: true,
        };
      });
      body = { type: "urlencoded", fields };
    } else {
      try {
        JSON.parse(dataRaw);
        body = { type: "json", content: dataRaw };
      } catch {
        body = { type: "raw", content: dataRaw, contentType: contentType || "text/plain" };
      }
    }
  }

  let auth: AuthConfig = { type: "none" };
  if (basicAuth) {
    auth = { type: "basic", username: basicAuth.username, password: basicAuth.password };
  }

  const kvHeaders: KeyValueEntry[] = headers.map((h) => ({
    id: generateId(),
    key: h.key,
    value: h.value,
    enabled: true,
  }));

  return { method, url, headers: kvHeaders, body, auth };
}

function normalizeCurl(input: string): string {
  // Join continuation lines: \ (bash) or ^ (CMD) at end of line
  let result = input.replace(/[\\^][ \t]*\r?\n[ \t]*/g, " ");
  // If CMD-style (^" present), strip all ^ escape chars
  if (/\^"/.test(result)) {
    result = result.replace(/\^(.)/g, "$1");
  }
  return result;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSQ = false;
  let inDQ = false;
  let escape = false;

  for (const ch of input) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "'" && !inDQ) {
      inSQ = !inSQ;
      continue;
    }
    if (ch === '"' && !inSQ) {
      inDQ = !inDQ;
      continue;
    }
    if (/\s/.test(ch) && !inSQ && !inDQ) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}
