import { useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { getBaseExtensions } from "@/lib/codemirror/extensions";
import { variablePlugin } from "@/lib/codemirror/variable-decoration";

export type CodeLanguage = "json" | "xml" | "html" | "javascript" | "text";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showVariableHighlight?: boolean;
  placeholder?: string;
  className?: string;
}

function getLanguageExtension(language: CodeLanguage): Extension[] {
  switch (language) {
    case "json": return [json()];
    case "xml": return [xml()];
    case "html": return [html()];
    case "javascript": return [javascript()];
    case "text": return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  showLineNumbers = true,
  showVariableHighlight = false,
  placeholder,
  className,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      ...getBaseExtensions({ readOnly, showLineNumbers }),
      ...getLanguageExtension(language),
      EditorView.lineWrapping,
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    } else {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString());
          }
        }),
      );
    }

    if (showVariableHighlight) {
      extensions.push(variablePlugin);
    }

    if (placeholder) {
      import("@codemirror/view").then(({ placeholder: ph }) => {
        // placeholder is added during initial setup below
      });
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly, showLineNumbers, showVariableHighlight]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"}
    />
  );
}
