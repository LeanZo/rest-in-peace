import type { AuthConfig } from "@/core/models/request";

export interface AuthResult {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
}

export function buildAuth(auth: AuthConfig): AuthResult {
  const headers: Record<string, string> = {};
  const queryParams: Record<string, string> = {};

  switch (auth.type) {
    case "basic": {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers["Authorization"] = `Basic ${encoded}`;
      break;
    }
    case "bearer": {
      const prefix = auth.prefix || "Bearer";
      headers["Authorization"] = `${prefix} ${auth.token}`;
      break;
    }
    case "apikey": {
      if (auth.addTo === "header") {
        headers[auth.key] = auth.value;
      } else {
        queryParams[auth.key] = auth.value;
      }
      break;
    }
    case "none":
      break;
  }

  return { headers, queryParams };
}
