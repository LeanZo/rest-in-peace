import type { BaseEntity, EntityId } from "./primitives";

export type SameSitePolicy = "Strict" | "Lax" | "None";

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: SameSitePolicy;
}

export interface CookieJar extends BaseEntity {
  collectionId: EntityId;
  cookies: CookieData[];
}
