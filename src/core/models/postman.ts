export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
  event?: PostmanEvent[];
}

export interface PostmanInfo {
  name: string;
  _postman_id?: string;
  description?: string;
  schema: string;
}

export type PostmanItem = PostmanFolder | PostmanRequest;

export interface PostmanFolder {
  name: string;
  item: PostmanItem[];
  description?: string;
  auth?: PostmanAuth;
  event?: PostmanEvent[];
}

export interface PostmanRequest {
  name: string;
  request: PostmanRequestDef;
  response?: unknown[];
}

export interface PostmanRequestDef {
  method: string;
  url: string | PostmanUrl;
  header?: PostmanHeader[];
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string | string[];
  port?: string;
  path?: string | string[];
  query?: PostmanQueryParam[];
  variable?: PostmanVariable[];
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

export interface PostmanBody {
  mode: "raw" | "formdata" | "urlencoded" | "file" | "graphql";
  raw?: string;
  formdata?: PostmanFormDataParam[];
  urlencoded?: PostmanUrlEncodedParam[];
  graphql?: PostmanGraphQL;
  options?: {
    raw?: { language?: string };
  };
  disabled?: boolean;
}

export interface PostmanFormDataParam {
  key: string;
  value?: string;
  type?: "text" | "file";
  src?: string;
  disabled?: boolean;
  contentType?: string;
  description?: string;
}

export interface PostmanUrlEncodedParam {
  key: string;
  value?: string;
  disabled?: boolean;
  description?: string;
}

export interface PostmanGraphQL {
  query?: string;
  variables?: string;
  operationName?: string;
}

export interface PostmanAuth {
  type: string;
  apikey?: PostmanAuthParam[];
  basic?: PostmanAuthParam[];
  bearer?: PostmanAuthParam[];
  [key: string]: unknown;
}

export interface PostmanAuthParam {
  key: string;
  value: unknown;
  type?: string;
}

export interface PostmanVariable {
  id?: string;
  key: string;
  value?: string;
  type?: string;
  name?: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanEvent {
  listen: string;
  script?: {
    exec?: string | string[];
    type?: string;
  };
  disabled?: boolean;
}

export function isPostmanFolder(item: PostmanItem): item is PostmanFolder {
  return "item" in item && Array.isArray((item as PostmanFolder).item);
}

export function isPostmanRequest(item: PostmanItem): item is PostmanRequest {
  return "request" in item;
}
