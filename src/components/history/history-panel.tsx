import { useState, useMemo } from "react";
import { useHistoryStore } from "@/stores/history-store";
import { useRequestStore } from "@/stores/request-store";
import { useCollectionStore } from "@/stores/collection-store";
import { MethodBadge, StatusBadge } from "@/primitives/badge";
import { Input } from "@/primitives/input";
import { CodeEditor, type CodeLanguage } from "@/primitives/code-editor";
import { formatTimestamp, formatDuration, formatBytes, getDateGroup } from "@/lib/format";
import { tryFormatJson } from "@/core/services/body-serializer";
import type { HistoryEntry } from "@/core/models/history";
import type { RequestConfig } from "@/core/models/request";
import { buildCurlFromHistory } from "@/core/services/curl-builder";
import { parseUrl } from "@/core/services/url-builder";
import { generateId } from "@/lib/id";
import { cn } from "@/lib/cn";

export function HistoryPanel() {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const openTabs = useRequestStore((s) => s.openTabs);
  const entries = useHistoryStore((s) => s.entries);
  const deleteEntry = useHistoryStore((s) => s.deleteEntry);
  const clearHistory = useHistoryStore((s) => s.clearRequestHistory);

  const activeTab = useMemo(
    () => openTabs.find((t) => t.id === activeTabId),
    [openTabs, activeTabId],
  );

  const filteredEntries = useMemo(() => {
    if (!activeTab) return [];
    let result = entries.filter((e) => e.requestId === activeTab.requestId);
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.resolvedRequest.url.toLowerCase().includes(lower) ||
          e.resolvedRequest.method.toLowerCase().includes(lower),
      );
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, activeTab, search]);

  const grouped = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);

  if (selectedEntry) {
    return (
      <HistoryDetail
        entry={selectedEntry}
        onBack={() => setSelectedEntry(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          History
        </span>
        {activeTab && filteredEntries.length > 0 && (
          <button
            onClick={() => clearHistory(activeTab.requestId)}
            className="text-[10px] text-text-muted hover:text-danger transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="px-3 py-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search history..."
          icon={
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-text-muted">
              {activeTab ? "No history yet" : "Select a request"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dateEntries]) => (
            <div key={date} className="mb-3">
              <div className="text-[10px] text-text-muted uppercase font-medium px-1 py-1">
                {date}
              </div>
              {dateEntries.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onSelect={() => setSelectedEntry(entry)}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  entry,
  onSelect,
  onDelete,
}: {
  entry: HistoryEntry;
  onSelect: () => void;
  onDelete: () => void;
}) {
  let pathname: string;
  try {
    pathname = new URL(entry.resolvedRequest.url).pathname;
  } catch {
    pathname = entry.resolvedRequest.url;
  }

  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover/50 cursor-pointer"
    >
      <MethodBadge method={entry.resolvedRequest.method} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-primary truncate font-mono">
          {pathname}
        </div>
      </div>
      <StatusBadge code={entry.response.statusCode} />
      <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
        {formatDuration(entry.response.timing.totalMs)}
      </span>
      <span className="text-[10px] text-text-muted whitespace-nowrap">
        {formatTimestamp(entry.timestamp)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-0.5"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function HistoryDetail({
  entry,
  onBack,
}: {
  entry: HistoryEntry;
  onBack: () => void;
}) {
  const [activeSection, setActiveSection] = useState<"request" | "response">("response");
  const [copied, setCopied] = useState(false);
  const openRequest = useRequestStore((s) => s.openRequest);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const updateRequest = useCollectionStore((s) => s.updateRequest);
  const requests = useCollectionStore((s) => s.requests);

  const { resolvedRequest, originalRequest, response } = entry;

  const handleCopyCurl = () => {
    const curl = buildCurlFromHistory(resolvedRequest);
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRequest = () => {
    const original = requests.get(entry.requestId);
    const date = new Date(entry.timestamp);
    const dateSuffix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const name = `${original?.name ?? "Request"} (${dateSuffix})`;

    const created = addRequest(entry.collectionId, original?.parentFolderId ?? undefined);

    if (originalRequest) {
      updateRequest(created.id, {
        name,
        method: originalRequest.method,
        url: originalRequest.url,
        headers: originalRequest.headers,
        params: originalRequest.params,
        body: originalRequest.body,
        auth: originalRequest.auth,
        routeParams: originalRequest.routeParams,
      });
      openRequest(created.id, {
        ...created,
        name,
        method: originalRequest.method,
        url: originalRequest.url,
        headers: originalRequest.headers,
        params: originalRequest.params,
        body: originalRequest.body,
        auth: originalRequest.auth,
        routeParams: originalRequest.routeParams,
      });
    } else {
      let body: RequestConfig["body"] = { type: "none" };
      if (resolvedRequest.body) {
        try {
          JSON.parse(resolvedRequest.body);
          body = { type: "json", content: resolvedRequest.body };
        } catch {
          body = { type: "raw", content: resolvedRequest.body, contentType: response.contentType || "text/plain" };
        }
      }
      updateRequest(created.id, {
        name,
        method: resolvedRequest.method,
        url: resolvedRequest.url,
        headers: resolvedRequest.headers.map((h) => ({
          id: generateId(),
          key: h.key,
          value: h.value,
          enabled: true,
        })),
        body,
      });
      openRequest(created.id, {
        ...created,
        name,
        method: resolvedRequest.method,
        url: resolvedRequest.url,
        headers: resolvedRequest.headers.map((h) => ({ id: generateId(), key: h.key, value: h.value, enabled: true })),
        body,
      });
    }
    onBack();
  };

  const responseBodyLang = detectLanguage(response.contentType);
  const formattedResponseBody =
    responseBodyLang === "json" ? tryFormatJson(response.body) : response.body;

  const requestBodyLang: CodeLanguage = resolvedRequest.body
    ? (() => { try { JSON.parse(resolvedRequest.body); return "json"; } catch { return "text"; } })()
    : "text";
  const formattedRequestBody = resolvedRequest.body
    ? (requestBodyLang === "json" ? tryFormatJson(resolvedRequest.body) : resolvedRequest.body)
    : "";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors p-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <MethodBadge method={resolvedRequest.method} size="sm" />
        <StatusBadge code={response.statusCode} text={response.statusText} />
        <span className="text-[10px] text-text-muted font-mono">
          {formatDuration(response.timing.totalMs)}
        </span>
        <span className="text-[10px] text-text-muted font-mono">
          {formatBytes(response.bodySize)}
        </span>
      </div>

      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-[11px] font-mono text-text-secondary truncate" title={resolvedRequest.url}>
          {resolvedRequest.url}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">
          {formatTimestamp(entry.timestamp)}
          {entry.environmentName && (
            <span className="ml-2 text-accent-purple">{entry.environmentName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center border-b border-border-subtle">
        <button
          onClick={() => setActiveSection("response")}
          className={cn(
            "flex-1 text-[11px] font-medium py-2 transition-colors",
            activeSection === "response"
              ? "text-accent-purple border-b-2 border-accent-purple"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          Response
        </button>
        <button
          onClick={() => setActiveSection("request")}
          className={cn(
            "flex-1 text-[11px] font-medium py-2 transition-colors",
            activeSection === "request"
              ? "text-accent-purple border-b-2 border-accent-purple"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          Request
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeSection === "response" ? (
          <ResponseSection
            body={formattedResponseBody}
            bodyLang={responseBodyLang}
            headers={response.headers}
          />
        ) : (
          <RequestSection
            url={resolvedRequest.url}
            headers={resolvedRequest.headers}
            body={formattedRequestBody}
            bodyLang={requestBodyLang}
            routeParams={originalRequest?.routeParams}
            auth={originalRequest?.auth}
          />
        )}
      </div>

      <div className="flex gap-2 px-3 py-2 border-t border-border-subtle">
        <button
          onClick={handleCopyCurl}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded bg-surface-overlay text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2H18a2 2 0 012 2v12a2 2 0 01-2 2h-8a2 2 0 01-2-2V4a2 2 0 012-2z" />
                <path d="M4 8h2v12h12v2H6a2 2 0 01-2-2V8z" />
              </svg>
              Copy cURL
            </>
          )}
        </button>
        <button
          onClick={handleCreateRequest}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create request
        </button>
      </div>
    </div>
  );
}

function ResponseSection({
  body,
  bodyLang,
  headers,
}: {
  body: string;
  bodyLang: CodeLanguage;
  headers: Array<{ key: string; value: string }>;
}) {
  const [showHeaders, setShowHeaders] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={() => setShowHeaders(!showHeaders)}
        className="flex items-center gap-1 px-3 py-1.5 text-[10px] text-text-muted hover:text-text-secondary"
      >
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          className={cn("transition-transform", showHeaders && "rotate-90")}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Headers ({headers.length})
      </button>

      {showHeaders && (
        <div className="px-3 pb-2">
          <table className="w-full text-[11px]">
            <tbody>
              {headers.map((h, i) => (
                <tr key={i} className="border-t border-border-subtle/50">
                  <td className="py-1 pr-2 font-mono text-accent-purple whitespace-nowrap align-top">
                    {h.key}
                  </td>
                  <td className="py-1 font-mono text-text-secondary break-all">
                    {h.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex-1 min-h-0 px-3 pb-2">
        {body ? (
          <div className="h-full min-h-[120px]">
            <CodeEditor value={body} language={bodyLang} readOnly />
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-xs text-text-muted">
            No response body
          </div>
        )}
      </div>
    </div>
  );
}

function RequestSection({
  url,
  headers,
  body,
  bodyLang,
  routeParams,
  auth,
}: {
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  bodyLang: CodeLanguage;
  routeParams?: Record<string, string>;
  auth?: import("@/core/models/request").AuthConfig;
}) {
  const [showParams, setShowParams] = useState(true);
  const [showRouteParams, setShowRouteParams] = useState(true);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showAuth, setShowAuth] = useState(true);

  const queryParams = useMemo(() => {
    const parsed = parseUrl(url);
    if (!parsed) return [];
    const params: Array<{ key: string; value: string }> = [];
    parsed.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    return params;
  }, [url]);

  const routeParamEntries = useMemo(() => {
    if (!routeParams) return [];
    return Object.entries(routeParams).filter(([, v]) => v);
  }, [routeParams]);

  const hasAuth = auth && auth.type !== "none";

  return (
    <div className="flex flex-col h-full">
      {routeParamEntries.length > 0 && (
        <>
          <CollapsibleHeader
            label="Route Params"
            count={routeParamEntries.length}
            open={showRouteParams}
            onToggle={() => setShowRouteParams(!showRouteParams)}
          />
          {showRouteParams && (
            <div className="px-3 pb-2">
              <table className="w-full text-[11px]">
                <tbody>
                  {routeParamEntries.map(([key, value], i) => (
                    <tr key={i} className="border-t border-border-subtle/50">
                      <td className="py-1 pr-2 font-mono text-method-patch whitespace-nowrap align-top">
                        :{key}
                      </td>
                      <td className="py-1 font-mono text-text-secondary break-all">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {queryParams.length > 0 && (
        <>
          <CollapsibleHeader
            label="Query Params"
            count={queryParams.length}
            open={showParams}
            onToggle={() => setShowParams(!showParams)}
          />
          {showParams && (
            <div className="px-3 pb-2">
              <table className="w-full text-[11px]">
                <tbody>
                  {queryParams.map((p, i) => (
                    <tr key={i} className="border-t border-border-subtle/50">
                      <td className="py-1 pr-2 font-mono text-method-get whitespace-nowrap align-top">
                        {p.key}
                      </td>
                      <td className="py-1 font-mono text-text-secondary break-all">
                        {p.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {hasAuth && (
        <>
          <CollapsibleHeader
            label={`Auth (${auth.type})`}
            open={showAuth}
            onToggle={() => setShowAuth(!showAuth)}
          />
          {showAuth && (
            <div className="px-3 pb-2">
              <table className="w-full text-[11px]">
                <tbody>
                  {auth.type === "basic" && (
                    <>
                      <tr className="border-t border-border-subtle/50">
                        <td className="py-1 pr-2 font-mono text-method-put whitespace-nowrap">username</td>
                        <td className="py-1 font-mono text-text-secondary break-all">{auth.username}</td>
                      </tr>
                      <tr className="border-t border-border-subtle/50">
                        <td className="py-1 pr-2 font-mono text-method-put whitespace-nowrap">password</td>
                        <td className="py-1 font-mono text-text-secondary break-all">{auth.password}</td>
                      </tr>
                    </>
                  )}
                  {auth.type === "bearer" && (
                    <tr className="border-t border-border-subtle/50">
                      <td className="py-1 pr-2 font-mono text-method-put whitespace-nowrap">token</td>
                      <td className="py-1 font-mono text-text-secondary break-all">{auth.token}</td>
                    </tr>
                  )}
                  {auth.type === "apikey" && (
                    <>
                      <tr className="border-t border-border-subtle/50">
                        <td className="py-1 pr-2 font-mono text-method-put whitespace-nowrap">{auth.key}</td>
                        <td className="py-1 font-mono text-text-secondary break-all">{auth.value}</td>
                      </tr>
                      <tr className="border-t border-border-subtle/50">
                        <td className="py-1 pr-2 font-mono text-method-put whitespace-nowrap">added to</td>
                        <td className="py-1 font-mono text-text-secondary">{auth.addTo}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <CollapsibleHeader
        label="Headers"
        count={headers.length}
        open={showHeaders}
        onToggle={() => setShowHeaders(!showHeaders)}
      />
      {showHeaders && (
        <div className="px-3 pb-2">
          {headers.length === 0 ? (
            <div className="text-[11px] text-text-muted py-1">No headers</div>
          ) : (
            <table className="w-full text-[11px]">
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-t border-border-subtle/50">
                    <td className="py-1 pr-2 font-mono text-accent-purple whitespace-nowrap align-top">
                      {h.key}
                    </td>
                    <td className="py-1 font-mono text-text-secondary break-all">
                      {h.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {body ? (
        <div className="flex-1 min-h-0 px-3 pb-2">
          <div className="h-full min-h-[120px]">
            <CodeEditor value={body} language={bodyLang} readOnly />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 text-xs text-text-muted">
          No request body
        </div>
      )}
    </div>
  );
}

function CollapsibleHeader({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-3 py-1.5 text-[10px] text-text-muted hover:text-text-secondary"
    >
      <svg
        width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
        className={cn("transition-transform", open && "rotate-90")}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
      {label}{count != null ? ` (${count})` : ""}
    </button>
  );
}

function detectLanguage(contentType: string): CodeLanguage {
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("javascript")) return "javascript";
  return "text";
}

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const groups: Record<string, HistoryEntry[]> = {};
  for (const entry of entries) {
    const group = getDateGroup(entry.timestamp);
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }
  return groups;
}
