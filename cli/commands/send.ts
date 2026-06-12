import type { HistoryEntry } from "@/core/models/history";
import type { ParsedArgs } from "../main";
import type { DataLayer } from "../data";
import { printResult, printError } from "../output";
import { maskHeaderPairs, maskCookies } from "../secrets";
import { buildAuth } from "@/core/services/auth-builder";
import { serializeBody } from "@/core/services/body-serializer";
import { buildResolvedMap, interpolate } from "@/core/services/template-engine";
import { buildUrl } from "@/core/services/url-builder";
import { getFlag, hasFlag } from "../main";

export async function handleSend(
  parsed: ParsedArgs,
  data: DataLayer,
): Promise<void> {
  const requestId = parsed.args[0];
  if (!requestId) return printError("Missing request ID", "MISSING_ID");

  const request = await data.getRequest(requestId);
  if (!request) return printError(`Request not found: ${requestId}`, "NOT_FOUND");

  const collection = await data.getCollection(request.collectionId);
  if (!collection) return printError(`Collection not found: ${request.collectionId}`, "NOT_FOUND");

  const envId = getFlag(parsed.flags, "environment") ?? collection.activeEnvironmentId;
  const variables = await data.getActiveVariables(request.collectionId, envId);
  const resolvedMap = buildResolvedMap(variables);

  const cookies = await data.getCookiesForCollection(request.collectionId);

  const { headers: authHeaders, queryParams: authQueryParams } = buildAuth(request.auth);
  const { body: serializedBody, contentType } = serializeBody(request.body);

  const resolvedUrl = interpolate(
    buildUrl(request.url, request.params, authQueryParams),
    resolvedMap,
  );

  const headers: Record<string, string> = {};

  if (collection.headers) {
    for (const h of collection.headers) {
      if (h.enabled) headers[h.key] = interpolate(h.value, resolvedMap);
    }
  }
  for (const h of request.headers) {
    if (h.enabled) headers[h.key] = interpolate(h.value, resolvedMap);
  }
  for (const [key, value] of Object.entries(authHeaders)) {
    headers[key] = value;
  }
  if (contentType) headers["Content-Type"] = contentType;

  if (cookies.length > 0) {
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    if (cookieStr) headers["Cookie"] = cookieStr;
  }

  let bodyToSend: string | null = null;
  if (typeof serializedBody === "string") {
    bodyToSend = interpolate(serializedBody, resolvedMap);
  }

  const startTime = performance.now();
  let response: Response;
  try {
    response = await fetch(resolvedUrl, {
      method: request.method,
      headers,
      body: bodyToSend,
      redirect: "follow",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return printError(`Request failed: ${message}`, "REQUEST_FAILED");
  }
  const totalMs = Math.round(performance.now() - startTime);

  const responseHeaders: Array<{ key: string; value: string }> = [];
  response.headers.forEach((value, key) => {
    responseHeaders.push({ key, value });
  });

  const responseBody = await response.text();
  const responseContentType = response.headers.get("content-type") ?? "text/plain";
  const bodySize = new TextEncoder().encode(responseBody).length;

  const result = {
    statusCode: response.status,
    statusText: response.statusText,
    headers: parsed.showSecrets ? responseHeaders : maskHeaderPairs(responseHeaders),
    body: responseBody,
    contentType: responseContentType,
    bodySize,
    timing: { totalMs },
  };

  if (!hasFlag(parsed.flags, "no-history")) {
    const resolvedHeaders = Object.entries(headers).map(([key, value]) => ({ key, value }));
    const env = envId ? await data.getEnvironment(envId) : null;

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      requestId: request.id,
      collectionId: request.collectionId,
      timestamp: Date.now(),
      resolvedRequest: {
        method: request.method,
        url: resolvedUrl,
        headers: resolvedHeaders,
        body: bodyToSend,
      },
      originalRequest: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        body: request.body,
        auth: request.auth,
        routeParams: request.routeParams,
      },
      response: {
        statusCode: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        contentType: responseContentType,
        bodySize,
        cookies: [],
        timing: { totalMs },
      },
      environmentName: env?.name ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await data.addHistoryEntry(entry);
  }

  printResult(result);
}
