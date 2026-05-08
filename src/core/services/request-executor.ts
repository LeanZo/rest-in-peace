import type { RequestConfig, ResolvedRequest } from "@/core/models/request";
import type { ResponseData } from "@/core/models/response";
import type { KeyValueEntry } from "@/core/models/primitives";
import type { EnvironmentVariable } from "@/core/models/environment";
import type { CookieData } from "@/core/models/cookie";
import { buildResolvedMap, interpolate } from "./template-engine";
import { buildAuth } from "./auth-builder";
import { buildUrl } from "./url-builder";
import { serializeBody } from "./body-serializer";
import {
  getCookiesForUrl,
  serializeCookies,
} from "./cookie-jar";
import { getHttpClient } from "@/core/adapters/http-client";

export interface ExecutionResult {
  response: ResponseData;
  resolvedRequest: ResolvedRequest;
}

export async function executeRequest(
  request: RequestConfig,
  variables: EnvironmentVariable[],
  cookies: CookieData[],
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  const variableMap = buildResolvedMap(variables);

  let resolvedUrl = interpolate(request.url, variableMap);

  if (request.routeParams) {
    for (const [name, value] of Object.entries(request.routeParams)) {
      if (value) {
        const resolved = interpolate(value, variableMap);
        resolvedUrl = resolvedUrl.replace(new RegExp(`:${name}\\b`), resolved);
      }
    }
  }

  const resolvedParams: KeyValueEntry[] = request.params.map((p) => ({
    ...p,
    key: interpolate(p.key, variableMap),
    value: interpolate(p.value, variableMap),
  }));

  const resolvedHeaders: Record<string, string> = {};
  for (const h of request.headers) {
    if (!h.enabled) continue;
    resolvedHeaders[interpolate(h.key, variableMap)] = interpolate(
      h.value,
      variableMap,
    );
  }

  const resolvedAuth = resolveAuth(request.auth, variableMap);
  const authResult = buildAuth(resolvedAuth);

  for (const [key, value] of Object.entries(authResult.headers)) {
    resolvedHeaders[key] = value;
  }

  const resolvedBody = resolveBody(request.body, variableMap);
  const { body, contentType } = serializeBody(resolvedBody);

  if (contentType && !resolvedHeaders["Content-Type"]) {
    resolvedHeaders["Content-Type"] = contentType;
  }

  const matchingCookies = getCookiesForUrl(cookies, resolvedUrl);
  if (matchingCookies.length > 0) {
    const existing = resolvedHeaders["Cookie"];
    const cookieStr = serializeCookies(matchingCookies);
    resolvedHeaders["Cookie"] = existing
      ? `${existing}; ${cookieStr}`
      : cookieStr;
  }

  const finalUrl = buildUrl(resolvedUrl, resolvedParams, authResult.queryParams);

  const resolved: ResolvedRequest = {
    method: request.method,
    url: finalUrl,
    headers: resolvedHeaders,
    body,
  };

  const client = getHttpClient();
  const response = await client.send(resolved, signal);

  return { response, resolvedRequest: resolved };
}

function resolveAuth(
  auth: RequestConfig["auth"],
  variables: ReadonlyMap<string, string>,
): RequestConfig["auth"] {
  switch (auth.type) {
    case "none":
      return auth;
    case "basic":
      return {
        ...auth,
        username: interpolate(auth.username, variables),
        password: interpolate(auth.password, variables),
      };
    case "bearer":
      return {
        ...auth,
        token: interpolate(auth.token, variables),
      };
    case "apikey":
      return {
        ...auth,
        key: interpolate(auth.key, variables),
        value: interpolate(auth.value, variables),
      };
  }
}

function resolveBody(
  body: RequestConfig["body"],
  variables: ReadonlyMap<string, string>,
): RequestConfig["body"] {
  switch (body.type) {
    case "none":
      return body;
    case "json":
      return { ...body, content: interpolate(body.content, variables) };
    case "raw":
      return { ...body, content: interpolate(body.content, variables) };
    case "graphql":
      return {
        ...body,
        query: interpolate(body.query, variables),
        variables: interpolate(body.variables, variables),
      };
    case "urlencoded":
      return {
        ...body,
        fields: body.fields.map((f) => ({
          ...f,
          key: interpolate(f.key, variables),
          value: interpolate(f.value, variables),
        })),
      };
    case "formdata":
      return {
        ...body,
        fields: body.fields.map((f) => ({
          ...f,
          key: interpolate(f.key, variables),
          value:
            f.fieldType === "text"
              ? interpolate(f.value, variables)
              : f.value,
        })),
      };
  }
}
