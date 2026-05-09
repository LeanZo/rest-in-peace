import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { HttpMethod } from "@/core/models/primitives";
import type { RequestConfig } from "@/core/models/request";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useCollectionStore } from "@/stores/collection-store";
import { isCurl, parseCurl } from "@/core/services/curl-parser";
import { buildCurl } from "@/core/services/curl-builder";
import { UrlInput } from "./url-input";
import { cn } from "@/lib/cn";
import { HTTP_METHODS, METHOD_COLORS } from "@/lib/constants";

interface UrlBarProps {
  draft: RequestConfig;
  isLoading: boolean;
  onUpdate: (patch: Partial<RequestConfig>) => void;
  onSend: () => void;
}

export function UrlBar({ draft, isLoading, onUpdate, onSend }: UrlBarProps) {
  const allEnvironments = useEnvironmentStore((s) => s.environments);
  const collection = useCollectionStore((s) =>
    s.collections.find((c) => c.id === draft.collectionId),
  );

  const variableNames = useMemo(() => {
    const names = new Set<string>();
    for (const env of allEnvironments) {
      if (env.collectionId !== draft.collectionId) continue;
      for (const v of env.variables) {
        if (v.enabled && v.name) names.add(v.name);
      }
    }
    return [...names].sort();
  }, [allEnvironments, draft.collectionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        onSend();
      }
    },
    [onSend],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain").trim();
      if (isCurl(text)) {
        e.preventDefault();
        const parsed = parseCurl(text);
        if (parsed) {
          onUpdate({
            method: parsed.method,
            url: parsed.url,
            headers: parsed.headers,
            body: parsed.body,
            auth: parsed.auth,
          });
        }
      }
    },
    [onUpdate],
  );

  return (
    <div className="flex items-center gap-2 p-3">
      <div className="relative">
        <select
          value={draft.method}
          onChange={(e) =>
            onUpdate({ method: e.target.value as HttpMethod })
          }
          className={cn(
            "appearance-none bg-surface-overlay border border-border-default rounded-lg",
            "px-3 py-2 pr-7 text-xs font-mono font-bold",
            "outline-none cursor-pointer transition-colors",
            "focus:border-accent-purple",
            METHOD_COLORS[draft.method],
          )}
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <UrlInput
        value={draft.url}
        onChange={(url) => onUpdate({ url })}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        variables={variableNames}
        placeholder="Enter URL or paste cURL..."
      />

      <SendSplitButton
        draft={draft}
        isLoading={isLoading}
        onSend={onSend}
      />
    </div>
  );
}

function SendSplitButton({
  draft,
  isLoading,
  onSend,
}: {
  draft: RequestConfig;
  isLoading: boolean;
  onSend: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleCopyCurl = () => {
    const curl = buildCurl(draft);
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  };

  const disabled = isLoading || !draft.url.trim();

  return (
    <div className="relative flex" ref={menuRef}>
      <button
        onClick={onSend}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-5 py-2 rounded-l-lg font-semibold text-sm transition-all duration-200",
          "bg-accent-green text-white",
          "hover:bg-accent-green-light hover:shadow-[0_0_24px_var(--color-accent-green-glow)]",
          "active:bg-accent-green-dim",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none",
        )}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cancel
          </>
        ) : (
          <>
            Send
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </>
        )}
      </button>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center px-1.5 py-2 rounded-r-lg border-l border-white/20 font-semibold text-sm transition-all duration-200",
          "bg-accent-green text-white",
          "hover:bg-accent-green-light",
          "active:bg-accent-green-dim",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-overlay border border-border-default rounded-lg shadow-lg z-50 py-1 animate-[fadeIn_100ms_ease-out]">
          <button
            onClick={handleCopyCurl}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 2H18a2 2 0 012 2v12a2 2 0 01-2 2h-8a2 2 0 01-2-2V4a2 2 0 012-2z" />
              <path d="M4 8h2v12h12v2H6a2 2 0 01-2-2V8z" />
            </svg>
            {copied ? "Copied!" : "Copy as cURL"}
          </button>
        </div>
      )}
    </div>
  );
}
