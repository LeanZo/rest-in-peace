import type { ResponseData } from "@/core/models/response";
import type { ResolvedRequest } from "@/core/models/request";
import { parseSetCookieHeaders } from "@/core/services/cookie-jar";
import { detectContentType } from "@/core/services/body-serializer";
import { isTauri } from "./platform";

export interface HttpClientAdapter {
  send(
    request: ResolvedRequest,
    signal?: AbortSignal,
  ): Promise<ResponseData>;
}

export class HttpResponseError extends Error {
  constructor(
    message: string,
    public response: ResponseData,
  ) {
    super(message);
  }
}

async function readResponse(
  response: Response,
  startTime: number,
  requestUrl: string,
): Promise<ResponseData> {
  const responseHeaders: Array<{ key: string; value: string }> = [];
  response.headers.forEach((value, key) => {
    responseHeaders.push({ key, value });
  });

  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    // Body stream may fail (e.g. truncated response) — keep empty body
  }

  const totalMs = performance.now() - startTime;
  const contentType =
    response.headers.get("content-type") || detectContentType(bodyText);

  let cookies: ReturnType<typeof parseSetCookieHeaders> = [];
  try {
    cookies = parseSetCookieHeaders(responseHeaders, requestUrl);
  } catch {
    // Cookie parsing may fail — continue without cookies
  }

  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: bodyText,
    contentType,
    bodySize: new Blob([bodyText]).size,
    cookies,
    timing: { totalMs },
  };
}

class FetchHttpClient implements HttpClientAdapter {
  async send(
    request: ResolvedRequest,
    signal?: AbortSignal,
  ): Promise<ResponseData> {
    const start = performance.now();

    const init: RequestInit = {
      method: request.method,
      headers: request.headers,
      signal,
    };

    if (
      request.body !== null &&
      !["GET", "HEAD"].includes(request.method)
    ) {
      init.body = request.body;
    }

    const response = await fetch(request.url, init);

    return readResponse(response, start, request.url);
  }
}

class TauriHttpClient implements HttpClientAdapter {
  async send(
    request: ResolvedRequest,
    signal?: AbortSignal,
  ): Promise<ResponseData> {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");

    const start = performance.now();

    const init: RequestInit = {
      method: request.method,
      headers: request.headers,
      signal,
    };

    if (
      request.body !== null &&
      !["GET", "HEAD"].includes(request.method)
    ) {
      init.body = request.body;
    }

    const response = await tauriFetch(request.url, init);

    return readResponse(response, start, request.url);
  }
}

let client: HttpClientAdapter | null = null;

export function getHttpClient(): HttpClientAdapter {
  if (!client) {
    client = isTauri() ? new TauriHttpClient() : new FetchHttpClient();
  }
  return client;
}
