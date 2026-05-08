import type { CookieData } from "./cookie";

export interface TimingData {
  totalMs: number;
}

export interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  contentType: string;
  bodySize: number;
  cookies: CookieData[];
  timing: TimingData;
}
