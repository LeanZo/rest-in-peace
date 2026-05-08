import type { RequestBody } from "@/core/models/request";
import { CONTENT_TYPES } from "@/lib/constants";

export interface SerializedBody {
  body: string | FormData | null;
  contentType: string | null;
}

export function serializeBody(requestBody: RequestBody): SerializedBody {
  switch (requestBody.type) {
    case "none":
      return { body: null, contentType: null };

    case "json":
      return {
        body: requestBody.content,
        contentType: CONTENT_TYPES.JSON,
      };

    case "raw":
      return {
        body: requestBody.content,
        contentType: requestBody.contentType || CONTENT_TYPES.TEXT,
      };

    case "formdata": {
      const formData = new FormData();
      for (const field of requestBody.fields) {
        if (!field.enabled) continue;
        formData.append(field.key, field.value);
      }
      return { body: formData, contentType: null };
    }

    case "urlencoded": {
      const params = new URLSearchParams();
      for (const field of requestBody.fields) {
        if (!field.enabled) continue;
        params.append(field.key, field.value);
      }
      return {
        body: params.toString(),
        contentType: CONTENT_TYPES.FORM_URLENCODED,
      };
    }

    case "graphql": {
      const payload: Record<string, unknown> = { query: requestBody.query };
      if (requestBody.variables) {
        try {
          payload.variables = JSON.parse(requestBody.variables);
        } catch {
          payload.variables = {};
        }
      }
      if (requestBody.operationName) {
        payload.operationName = requestBody.operationName;
      }
      return {
        body: JSON.stringify(payload),
        contentType: CONTENT_TYPES.JSON,
      };
    }
  }
}

export function detectContentType(body: string): string {
  const trimmed = body.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return CONTENT_TYPES.JSON;
    } catch {
      // not valid JSON
    }
  }
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    if (trimmed.toLowerCase().includes("<!doctype html") || trimmed.toLowerCase().includes("<html")) {
      return CONTENT_TYPES.HTML;
    }
    return CONTENT_TYPES.XML;
  }
  return CONTENT_TYPES.TEXT;
}

export function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
