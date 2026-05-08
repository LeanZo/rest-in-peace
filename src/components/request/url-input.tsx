import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { tokenizeUrl, TOKEN_COLORS } from "@/core/services/url-parser";
import { cn } from "@/lib/cn";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  variables: string[];
  placeholder?: string;
}

export function UrlInput({
  value,
  onChange,
  onKeyDown,
  onPaste,
  variables,
  placeholder,
}: UrlInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingCursor = useRef<number | null>(null);
  const composingRef = useRef(false);

  function getCursorOffset(): number {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !el) return 0;
    const range = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function getSelectionOffsets(): [number, number] {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !el || sel.isCollapsed) {
      const c = getCursorOffset();
      return [c, c];
    }
    const range = sel.getRangeAt(0);
    const pre1 = document.createRange();
    pre1.selectNodeContents(el);
    pre1.setEnd(range.startContainer, range.startOffset);
    const start = pre1.toString().length;
    const pre2 = document.createRange();
    pre2.selectNodeContents(el);
    pre2.setEnd(range.endContainer, range.endOffset);
    return [start, pre2.toString().length];
  }

  function setCursorAt(offset: number) {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;

    if (!el.childNodes.length) {
      const range = document.createRange();
      range.setStart(el, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    let remaining = offset;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const tokens = tokenizeUrl(value);
    el.textContent = "";
    for (const t of tokens) {
      const span = document.createElement("span");
      span.className = TOKEN_COLORS[t.type];
      span.textContent = t.text;
      el.appendChild(span);
    }

    if (document.activeElement === el) {
      setCursorAt(pendingCursor.current ?? value.length);
    }
    pendingCursor.current = null;
  }, [value]);

  const handleInput = useCallback(() => {
    if (composingRef.current) return;
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent ?? "";
    pendingCursor.current = getCursorOffset();
    onChange(text);

    const cursor = pendingCursor.current;
    const before = text.slice(0, cursor);
    const match = before.match(/\{\{([a-zA-Z_][\w]*)?$/);
    if (match && variables.length > 0) {
      setFilter(match[1] || "");
      setShowSuggestions(true);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  }, [onChange, variables]);

  const filtered = showSuggestions
    ? variables.filter((v) => v.toLowerCase().includes(filter.toLowerCase()))
    : [];

  const insertVariable = useCallback(
    (varName: string) => {
      const cursor = pendingCursor.current ?? getCursorOffset();
      const before = value.slice(0, cursor);
      const match = before.match(/\{\{([a-zA-Z_][\w]*)$/);
      if (match) {
        const start = cursor - match[1].length;
        const after = value.slice(cursor);
        pendingCursor.current = start + varName.length + 2;
        onChange(value.slice(0, start) + varName + "}}" + after);
      }
      setShowSuggestions(false);
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        insertVariable(filtered[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    onPaste?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/[\n\r]/g, "");
    const [selStart, selEnd] = getSelectionOffsets();
    pendingCursor.current = selStart + text.length;
    onChange(value.slice(0, selStart) + text + value.slice(selEnd));
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel) e.clipboardData.setData("text/plain", sel.toString());
  };

  const handleCut = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    e.clipboardData.setData("text/plain", sel.toString());
    const [start, end] = getSelectionOffsets();
    pendingCursor.current = start;
    onChange(value.slice(0, start) + value.slice(end));
  };

  return (
    <div className="flex-1 relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onDrop={(e) => e.preventDefault()}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => {
          composingRef.current = false;
          handleInput();
        }}
        className={cn(
          "w-full bg-surface-overlay border border-border-default rounded-lg",
          "px-4 py-2 text-sm font-mono min-h-[38px]",
          "outline-none transition-colors",
          "focus:border-accent-purple",
          "whitespace-nowrap overflow-x-auto overflow-y-hidden",
          "scrollbar-none",
        )}
        spellCheck={false}
        role="textbox"
        aria-label="URL input"
      />

      {!value && (
        <div className="absolute inset-0 pointer-events-none border border-transparent rounded-lg px-4 py-2 text-sm font-mono text-text-muted">
          {placeholder}
        </div>
      )}

      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-surface-overlay border border-border-default rounded-md shadow-xl z-50 max-h-48 overflow-y-auto min-w-[220px]">
          {filtered.map((v, i) => (
            <button
              key={v}
              onMouseDown={(e) => {
                e.preventDefault();
                insertVariable(v);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs font-mono transition-colors",
                i === selectedIdx
                  ? "bg-accent-purple/20 text-green-400"
                  : "text-text-secondary hover:bg-surface-hover",
              )}
            >
              <span className="text-green-400">{`{{${v}}}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
