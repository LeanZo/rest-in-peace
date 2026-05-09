export interface InsomniaExport {
  _type: "export";
  __export_format: 4;
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

export type InsomniaResource =
  | InsomniaWorkspace
  | InsomniaRequestGroup
  | InsomniaRequest
  | InsomniaEnvironment
  | InsomniaCookieJar;

export interface InsomniaWorkspace {
  _id: string;
  _type: "workspace";
  parentId: string | null;
  name: string;
  description?: string;
  scope?: string;
  created?: number;
  modified?: number;
}

export interface InsomniaRequestGroup {
  _id: string;
  _type: "request_group";
  parentId: string;
  name: string;
  description?: string;
  environment?: Record<string, unknown>;
  metaSortKey?: number;
  created?: number;
  modified?: number;
}

export interface InsomniaRequest {
  _id: string;
  _type: "request";
  parentId: string;
  name: string;
  method: string;
  url: string;
  body?: InsomniaBody;
  headers?: InsomniaHeader[];
  parameters?: InsomniaParam[];
  authentication?: InsomniaAuth;
  metaSortKey?: number;
  isPrivate?: boolean;
  settingEncodeUrl?: boolean;
  settingSendCookies?: boolean;
  settingStoreCookies?: boolean;
  created?: number;
  modified?: number;
}

export interface InsomniaBody {
  mimeType?: string;
  text?: string;
  params?: InsomniaBodyParam[];
}

export interface InsomniaBodyParam {
  id?: string;
  name: string;
  value: string;
  type?: "text" | "file";
  fileName?: string;
  disabled?: boolean;
  description?: string;
}

export interface InsomniaHeader {
  id?: string;
  name: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

export interface InsomniaParam {
  id?: string;
  name: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

export interface InsomniaAuth {
  type?: string;
  token?: string;
  prefix?: string;
  username?: string;
  password?: string;
  addTo?: string;
  key?: string;
  value?: string;
}

export interface InsomniaEnvironment {
  _id: string;
  _type: "environment";
  parentId: string;
  name: string;
  data?: Record<string, string>;
  dataPropertyOrder?: Record<string, string[]>;
  color?: string;
  isPrivate?: boolean;
  metaSortKey?: number;
  created?: number;
  modified?: number;
}

export interface InsomniaCookieJar {
  _id: string;
  _type: "cookie_jar";
  parentId: string;
  name: string;
  cookies?: unknown[];
  created?: number;
  modified?: number;
}
