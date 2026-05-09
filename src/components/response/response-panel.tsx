import { useUIStore } from "@/stores/ui-store";
import ripIcon from "@/media/images/REST in Peace - Outline - 90.png";
import { Tabs, type TabItem } from "@/primitives/tabs";
import { StatusBadge } from "@/primitives/badge";
import { CodeEditor, type CodeLanguage } from "@/primitives/code-editor";
import { formatBytes, formatDuration } from "@/lib/format";
import { tryFormatJson } from "@/core/services/body-serializer";
import type { ResponseData } from "@/core/models/response";
import { cn } from "@/lib/cn";

interface ResponsePanelProps {
  execution: {
    status: "idle" | "sending" | "success" | "error" | "cancelled";
    response: ResponseData | null;
    error: string | null;
  };
}

export function ResponsePanel({ execution }: ResponsePanelProps) {
  const activeTab = useUIStore((s) => s.activeResponseTab);
  const setActiveTab = useUIStore((s) => s.setActiveResponseTab);

  if (execution.status === "idle") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-text-muted/30 mb-3">
            <div
              className="mx-auto"
              style={{
                width: 128,
                height: 128,
                WebkitMaskImage: `url(${ripIcon})`,
                maskImage: `url(${ripIcon})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                backgroundColor: "currentColor",
              }}
            />
          </div>
          <p className="text-sm text-text-muted">
            Send a request to see the response
          </p>
          <p className="text-xs text-text-muted/60 mt-1">
            Ctrl + Enter to send
          </p>
        </div>
      </div>
    );
  }

  if (execution.status === "sending") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-accent-purple mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-text-secondary">Sending request...</p>
        </div>
      </div>
    );
  }

  if (execution.status === "error" || execution.status === "cancelled") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3",
            execution.status === "cancelled" ? "bg-amber-500/10" : "bg-danger/10",
          )}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={execution.status === "cancelled" ? "text-amber-400" : "text-danger"}
            >
              {execution.status === "cancelled" ? (
                <><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></>
              ) : (
                <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
              )}
            </svg>
          </div>
          <p className="text-sm text-text-secondary">
            {execution.status === "cancelled" ? "Request cancelled" : "Request failed"}
          </p>
          {execution.error && (
            <p className="text-xs text-text-muted mt-1 max-w-[300px]">
              {execution.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  const response = execution.response!;

  const tabs: TabItem[] = [
    { id: "body", label: "Response" },
    { id: "headers", label: "Headers", badge: response.headers.length },
    { id: "cookies", label: "Cookies", badge: response.cookies.length },
  ];

  const detectedLang = detectLanguage(response.contentType);
  const formattedBody =
    detectedLang === "json" ? tryFormatJson(response.body) : response.body;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 pt-2">
        <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} size="sm" />
        <div className="flex items-center gap-3 text-xs shrink-0 pl-4">
          <StatusBadge code={response.statusCode} text={response.statusText} />
          <span className="text-text-muted font-mono">
            {formatDuration(response.timing.totalMs)}
          </span>
          <span className="text-text-muted font-mono">
            {formatBytes(response.bodySize)}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3">
        {activeTab === "body" && (
          <CodeEditor
            value={formattedBody}
            language={detectedLang}
            readOnly
          />
        )}

        {activeTab === "headers" && (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted text-left">
                  <th className="font-medium pb-2 pr-4">Header</th>
                  <th className="font-medium pb-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {response.headers.map((h, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    <td className="py-1.5 pr-4 font-mono text-accent-purple whitespace-nowrap">
                      {h.key}
                    </td>
                    <td className="py-1.5 font-mono text-text-secondary break-all">
                      {h.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "cookies" && (
          <div className="overflow-auto h-full">
            {response.cookies.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-text-muted">
                No cookies in response
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted text-left">
                    <th className="font-medium pb-2 pr-4">Name</th>
                    <th className="font-medium pb-2 pr-4">Value</th>
                    <th className="font-medium pb-2 pr-4">Domain</th>
                    <th className="font-medium pb-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {response.cookies.map((c, i) => (
                    <tr key={i} className="border-t border-border-subtle">
                      <td className="py-1.5 pr-4 font-mono text-accent-purple">
                        {c.name}
                      </td>
                      <td className="py-1.5 pr-4 font-mono text-text-secondary max-w-[200px] truncate">
                        {c.value}
                      </td>
                      <td className="py-1.5 pr-4 text-text-muted">{c.domain}</td>
                      <td className="py-1.5 text-text-muted">{c.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function detectLanguage(contentType: string): CodeLanguage {
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (contentType.includes("html")) return "html";
  if (contentType.includes("javascript")) return "javascript";
  return "text";
}
