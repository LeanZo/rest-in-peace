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
    const bodyText = await response.text();
    const totalMs = performance.now() - start;

    const responseHeaders: Array<{ key: string; value: string }> = [];
    response.headers.forEach((value, key) => {
      responseHeaders.push({ key, value });
    });

    const contentType =
      response.headers.get("content-type") || detectContentType(bodyText);
    const cookies = parseSetCookieHeaders(responseHeaders, request.url);

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
    const bodyText = await response.text();
    const totalMs = performance.now() - start;

    const responseHeaders: Array<{ key: string; value: string }> = [];
    response.headers.forEach((value, key) => {
      responseHeaders.push({ key, value });
    });

    const contentType =
      response.headers.get("content-type") || detectContentType(bodyText);
    const cookies = parseSetCookieHeaders(responseHeaders, request.url);

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
}

let client: HttpClientAdapter | null = null;

export function getHttpClient(): HttpClientAdapter {
  if (!client) {
    client = isTauri() ? new TauriHttpClient() : new FetchHttpClient();
  }
  return client;
}
