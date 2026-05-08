import { keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import { ripEditorTheme, ripSyntaxHighlighting } from "./theme";

export function getBaseExtensions(options: {
  readOnly?: boolean;
  showLineNumbers?: boolean;
} = {}): Extension[] {
  const extensions: Extension[] = [
    ripEditorTheme,
    ripSyntaxHighlighting,
    highlightSpecialChars(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    foldGutter(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
    ]),
  ];

  if (options.showLineNumbers !== false) {
    extensions.push(lineNumbers());
  }

  return extensions;
}
