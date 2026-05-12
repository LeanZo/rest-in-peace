import { useState, useMemo } from "react";
import { marked } from "marked";
import { CodeEditor } from "@/primitives/code-editor";
import { cn } from "@/lib/cn";

marked.setOptions({ gfm: true, breaks: true });

interface DocsEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DocsEditor({ value, onChange, placeholder }: DocsEditorProps) {
  const hasContent = value.trim().length > 0;
  const [userMode, setUserMode] = useState<"write" | "preview" | null>(null);
  const mode = userMode ?? (hasContent ? "preview" : "write");

  const renderedHtml = useMemo(() => {
    if (mode !== "preview") return "";
    return marked.parse(value || "") as string;
  }, [mode, value]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-0.5 bg-surface-base rounded-lg w-fit mb-2">
        <button
          onClick={() => setUserMode("write")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
            mode === "write"
              ? "bg-surface-overlay text-text-primary"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          Write
        </button>
        <button
          onClick={() => setUserMode("preview")}
          className={cn(
            "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
            mode === "preview"
              ? "bg-surface-overlay text-text-primary"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "write" ? (
          <CodeEditor
            value={value}
            onChange={onChange}
            language="markdown"
            showLineNumbers={false}
            placeholder={placeholder}
          />
        ) : hasContent ? (
          <div
            className="markdown-preview overflow-auto h-full px-1"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">
            No documentation yet
          </div>
        )}
      </div>
    </div>
  );
}
