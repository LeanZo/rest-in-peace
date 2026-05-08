import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const ripEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-surface-input)",
      color: "var(--color-text-primary)",
      fontSize: "13px",
      fontFamily: "var(--font-mono)",
    },
    ".cm-content": {
      caretColor: "var(--color-accent-green)",
      padding: "8px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent-green)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(168, 85, 247, 0.2) !important",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(42, 42, 58, 0.5)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-surface-raised)",
      color: "var(--color-text-muted)",
      border: "none",
      borderRight: "1px solid var(--color-border-subtle)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(42, 42, 58, 0.5)",
      color: "var(--color-text-secondary)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px",
      minWidth: "32px",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(168, 85, 247, 0.15)",
      outline: "1px solid rgba(168, 85, 247, 0.4)",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(34, 197, 94, 0.2)",
      outline: "1px solid rgba(34, 197, 94, 0.4)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(34, 197, 94, 0.35)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--color-surface-overlay)",
      border: "1px solid var(--color-border-default)",
      color: "var(--color-text-muted)",
      padding: "0 4px",
      borderRadius: "3px",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--color-surface-overlay)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li": {
        padding: "4px 8px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "var(--color-surface-hover)",
        color: "var(--color-text-primary)",
      },
    },
    ".cm-panels": {
      backgroundColor: "var(--color-surface-raised)",
      borderTop: "1px solid var(--color-border-default)",
    },
    ".cm-panel.cm-search": {
      padding: "8px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: "var(--color-surface-input)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "4px",
      padding: "4px 8px",
      outline: "none",
    },
    ".cm-panel.cm-search input:focus": {
      borderColor: "var(--color-accent-purple)",
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "var(--color-surface-overlay)",
      color: "var(--color-text-secondary)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "4px",
      padding: "4px 8px",
      cursor: "pointer",
    },
    ".cm-panel.cm-search button:hover": {
      backgroundColor: "var(--color-surface-hover)",
    },
  },
  { dark: true },
);

const ripHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc" },
  { tag: tags.operator, color: "#c084fc" },
  { tag: tags.special(tags.variableName), color: "#4ade80" },
  { tag: tags.typeName, color: "#22d3ee" },
  { tag: tags.atom, color: "#fb923c" },
  { tag: tags.number, color: "#f59e0b" },
  { tag: tags.bool, color: "#fb923c" },
  { tag: tags.null, color: "#fb923c" },
  { tag: tags.definition(tags.variableName), color: "#e2e8f0" },
  { tag: tags.string, color: "#4ade80" },
  { tag: tags.escape, color: "#22d3ee" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: tags.propertyName, color: "#c084fc" },
  { tag: tags.attributeName, color: "#c084fc" },
  { tag: tags.attributeValue, color: "#4ade80" },
  { tag: tags.tagName, color: "#22d3ee" },
  { tag: tags.angleBracket, color: "#94a3b8" },
  { tag: tags.bracket, color: "#94a3b8" },
  { tag: tags.paren, color: "#94a3b8" },
  { tag: tags.squareBracket, color: "#94a3b8" },
  { tag: tags.punctuation, color: "#94a3b8" },
  { tag: tags.separator, color: "#94a3b8" },
]);

export const ripSyntaxHighlighting = syntaxHighlighting(ripHighlightStyle);
