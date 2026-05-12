import { useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useCookieStore } from "@/stores/cookie-store";
import { Tabs, type TabItem } from "@/primitives/tabs";
import { KeyValueTable } from "@/primitives/key-value-table";
import { CodeEditor } from "@/primitives/code-editor";
import { CookiesEditor } from "./cookies-editor";
import { ParamsEditor } from "./params-editor";
import { DocsEditor } from "@/components/docs/docs-editor";
import { UrlBar } from "./url-bar";
import { syncParamsFromUrl } from "@/core/services/url-parser";
import type { RequestConfig } from "@/core/models/request";
import type { KeyValueEntry } from "@/core/models/primitives";
import { cn } from "@/lib/cn";

interface RequestPanelProps {
  draft: RequestConfig;
  isLoading: boolean;
  onUpdate: (patch: Partial<RequestConfig>) => void;
  onSend: () => void;
}

const REQUEST_TABS: TabItem[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
  { id: "cookies", label: "Cookies" },
  { id: "docs", label: "Docs" },
];

const BODY_TYPES = [
  { id: "none", label: "None" },
  { id: "json", label: "JSON" },
  { id: "raw", label: "Raw" },
  { id: "formdata", label: "Form Data" },
  { id: "urlencoded", label: "URL Encoded" },
  { id: "graphql", label: "GraphQL" },
];

export function RequestPanel({ draft, isLoading, onUpdate, onSend }: RequestPanelProps) {
  const activeTab = useUIStore((s) => s.activeRequestTab);
  const setActiveTab = useUIStore((s) => s.setActiveRequestTab);
  const cookieCount = useCookieStore((s) => s.getCookiesForCollection(draft.collectionId).length);

  const handleUrlUpdate = useCallback(
    (patch: Partial<RequestConfig>) => {
      if ("url" in patch && patch.url !== undefined && !("params" in patch)) {
        const synced = syncParamsFromUrl(patch.url, draft.params);
        onUpdate({ ...patch, params: synced });
      } else {
        onUpdate(patch);
      }
    },
    [onUpdate, draft.params],
  );

  const tabs = REQUEST_TABS.map((t) => {
    if (t.id === "params" && draft.params.length > 0)
      return { ...t, badge: draft.params.filter((p) => p.enabled).length };
    if (t.id === "headers" && draft.headers.length > 0)
      return { ...t, badge: draft.headers.filter((h) => h.enabled).length };
    if (t.id === "cookies" && cookieCount > 0)
      return { ...t, badge: cookieCount };
    return t;
  });

  return (
    <div className="flex flex-col h-full">
      <UrlBar draft={draft} isLoading={isLoading} onUpdate={handleUrlUpdate} onSend={onSend} />

      <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} size="sm" />

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "params" && (
          <ParamsEditor
            url={draft.url}
            params={draft.params}
            routeParams={draft.routeParams ?? {}}
            onUpdate={(patch) => onUpdate(patch)}
          />
        )}

        {activeTab === "headers" && (
          <KeyValueTable
            entries={draft.headers}
            onChange={(headers: KeyValueEntry[]) => onUpdate({ headers })}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
        )}

        {activeTab === "body" && (
          <BodyEditor draft={draft} onUpdate={onUpdate} />
        )}

        {activeTab === "auth" && (
          <AuthEditor draft={draft} onUpdate={onUpdate} />
        )}

        {activeTab === "cookies" && (
          <CookiesEditor collectionId={draft.collectionId} />
        )}

        {activeTab === "docs" && (
          <DocsEditor
            value={draft.docs ?? ""}
            onChange={(docs) => onUpdate({ docs })}
            placeholder="Write documentation for this request...\n\nSupports Markdown: headings, bold, code blocks, lists, links..."
          />
        )}
      </div>
    </div>
  );
}

function BodyEditor({
  draft,
  onUpdate,
}: {
  draft: RequestConfig;
  onUpdate: (patch: Partial<RequestConfig>) => void;
}) {
  const bodyType = draft.body.type;

  const setBodyType = (type: string) => {
    switch (type) {
      case "none":
        onUpdate({ body: { type: "none" } });
        break;
      case "json":
        onUpdate({ body: { type: "json", content: draft.body.type === "json" ? draft.body.content : "" } });
        break;
      case "raw":
        onUpdate({ body: { type: "raw", content: "", contentType: "text/plain" } });
        break;
      case "formdata":
        onUpdate({ body: { type: "formdata", fields: [] } });
        break;
      case "urlencoded":
        onUpdate({ body: { type: "urlencoded", fields: [] } });
        break;
      case "graphql":
        onUpdate({ body: { type: "graphql", query: "", variables: "" } });
        break;
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-1 p-0.5 bg-surface-base rounded-lg w-fit">
        {BODY_TYPES.map((bt) => (
          <button
            key={bt.id}
            onClick={() => setBodyType(bt.id)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
              bodyType === bt.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {bt.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {bodyType === "none" && (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">
            This request does not have a body
          </div>
        )}

        {bodyType === "json" && (
          <CodeEditor
            value={draft.body.type === "json" ? draft.body.content : ""}
            onChange={(content) =>
              onUpdate({ body: { type: "json", content } })
            }
            language="json"
            showVariableHighlight
          />
        )}

        {bodyType === "raw" && (
          <CodeEditor
            value={draft.body.type === "raw" ? draft.body.content : ""}
            onChange={(content) =>
              onUpdate({
                body: {
                  type: "raw",
                  content,
                  contentType: draft.body.type === "raw" ? draft.body.contentType : "text/plain",
                },
              })
            }
            language="text"
            showVariableHighlight
          />
        )}

        {bodyType === "formdata" && (
          <KeyValueTable
            entries={
              draft.body.type === "formdata"
                ? draft.body.fields.map((f) => ({
                    id: f.id,
                    key: f.key,
                    value: f.value,
                    enabled: f.enabled,
                  }))
                : []
            }
            onChange={(entries) =>
              onUpdate({
                body: {
                  type: "formdata",
                  fields: entries.map((e) => ({
                    ...e,
                    fieldType: "text" as const,
                  })),
                },
              })
            }
          />
        )}

        {bodyType === "urlencoded" && (
          <KeyValueTable
            entries={draft.body.type === "urlencoded" ? draft.body.fields : []}
            onChange={(fields) =>
              onUpdate({ body: { type: "urlencoded", fields } })
            }
          />
        )}

        {bodyType === "graphql" && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Query</label>
              <CodeEditor
                value={draft.body.type === "graphql" ? draft.body.query : ""}
                onChange={(query) =>
                  onUpdate({
                    body: {
                      type: "graphql",
                      query,
                      variables: draft.body.type === "graphql" ? draft.body.variables : "",
                    },
                  })
                }
                language="text"
                showLineNumbers={false}
              />
            </div>
            <div className="h-32">
              <label className="text-xs text-text-muted mb-1 block">Variables (JSON)</label>
              <CodeEditor
                value={draft.body.type === "graphql" ? draft.body.variables : ""}
                onChange={(variables) =>
                  onUpdate({
                    body: {
                      type: "graphql",
                      query: draft.body.type === "graphql" ? draft.body.query : "",
                      variables,
                    },
                  })
                }
                language="json"
                showLineNumbers={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthEditor({
  draft,
  onUpdate,
}: {
  draft: RequestConfig;
  onUpdate: (patch: Partial<RequestConfig>) => void;
}) {
  const authType = draft.auth.type;

  const AUTH_TYPES = [
    { value: "none", label: "No Auth" },
    { value: "basic", label: "Basic Auth" },
    { value: "bearer", label: "Bearer Token" },
    { value: "apikey", label: "API Key" },
  ];

  const setAuthType = (type: string) => {
    switch (type) {
      case "none":
        onUpdate({ auth: { type: "none" } });
        break;
      case "basic":
        onUpdate({ auth: { type: "basic", username: "", password: "" } });
        break;
      case "bearer":
        onUpdate({ auth: { type: "bearer", token: "" } });
        break;
      case "apikey":
        onUpdate({
          auth: { type: "apikey", key: "", value: "", addTo: "header" },
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-text-muted mb-1.5 block">Auth Type</label>
        <select
          value={authType}
          onChange={(e) => setAuthType(e.target.value)}
          className="bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
        >
          {AUTH_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {authType === "basic" && draft.auth.type === "basic" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Username</label>
            <input
              value={draft.auth.username}
              onChange={(e) =>
                onUpdate({ auth: { ...draft.auth, username: e.target.value } as RequestConfig["auth"] })
              }
              className="w-full bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
              placeholder="Username"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Password</label>
            <input
              type="password"
              value={draft.auth.password}
              onChange={(e) =>
                onUpdate({ auth: { ...draft.auth, password: e.target.value } as RequestConfig["auth"] })
              }
              className="w-full bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
              placeholder="Password"
            />
          </div>
        </div>
      )}

      {authType === "bearer" && draft.auth.type === "bearer" && (
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Token</label>
          <input
            value={draft.auth.token}
            onChange={(e) =>
              onUpdate({ auth: { ...draft.auth, token: e.target.value } as RequestConfig["auth"] })
            }
            className="w-full bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple font-mono text-xs"
            placeholder="Enter bearer token..."
          />
        </div>
      )}

      {authType === "apikey" && draft.auth.type === "apikey" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Key</label>
              <input
                value={draft.auth.key}
                onChange={(e) =>
                  onUpdate({ auth: { ...draft.auth, key: e.target.value } as RequestConfig["auth"] })
                }
                className="w-full bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
                placeholder="X-API-Key"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Value</label>
              <input
                value={draft.auth.value}
                onChange={(e) =>
                  onUpdate({ auth: { ...draft.auth, value: e.target.value } as RequestConfig["auth"] })
                }
                className="w-full bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
                placeholder="Enter API key..."
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Add to</label>
            <select
              value={draft.auth.addTo}
              onChange={(e) =>
                onUpdate({
                  auth: {
                    ...draft.auth,
                    addTo: e.target.value as "header" | "query",
                  } as RequestConfig["auth"],
                })
              }
              className="bg-surface-input text-text-primary text-sm rounded-md border border-border-default px-3 py-1.5 outline-none focus:border-accent-purple"
            >
              <option value="header">Header</option>
              <option value="query">Query Param</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
