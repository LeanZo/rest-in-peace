import type { HttpMethod } from "@/core/models/primitives";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-cyan-400",
  POST: "text-purple-400",
  PUT: "text-amber-400",
  PATCH: "text-orange-400",
  DELETE: "text-red-400",
  HEAD: "text-gray-400",
  OPTIONS: "text-gray-400",
  TRACE: "text-gray-400",
};

export const METHOD_BG_COLORS: Record<HttpMethod, string> = {
  GET: "bg-cyan-400/15 text-cyan-400",
  POST: "bg-purple-400/15 text-purple-400",
  PUT: "bg-amber-400/15 text-amber-400",
  PATCH: "bg-orange-400/15 text-orange-400",
  DELETE: "bg-red-400/15 text-red-400",
  HEAD: "bg-gray-400/15 text-gray-400",
  OPTIONS: "bg-gray-400/15 text-gray-400",
  TRACE: "bg-gray-400/15 text-gray-400",
};

export const STATUS_COLORS: Record<string, string> = {
  "2xx": "text-green-400",
  "3xx": "text-blue-400",
  "4xx": "text-amber-400",
  "5xx": "text-red-400",
};

export function getStatusColorClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return STATUS_COLORS["2xx"];
  if (statusCode >= 300 && statusCode < 400) return STATUS_COLORS["3xx"];
  if (statusCode >= 400 && statusCode < 500) return STATUS_COLORS["4xx"];
  if (statusCode >= 500) return STATUS_COLORS["5xx"];
  return "text-gray-400";
}

export const COMMON_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Disposition",
  "Content-Encoding",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "Origin",
  "Pragma",
  "Referer",
  "User-Agent",
  "X-Forwarded-For",
  "X-Request-ID",
  "X-Requested-With",
];

export const CONTENT_TYPES = {
  JSON: "application/json",
  XML: "application/xml",
  HTML: "text/html",
  TEXT: "text/plain",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  FORM_DATA: "multipart/form-data",
  GRAPHQL: "application/graphql",
} as const;

export const MAX_HISTORY_PER_REQUEST = 50;
