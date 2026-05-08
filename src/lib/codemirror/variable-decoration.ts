import {
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  type EditorView,
  MatchDecorator,
} from "@codemirror/view";

const variableMark = Decoration.mark({
  class: "cm-variable-highlight",
});

const decorator = new MatchDecorator({
  regexp: /\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/g,
  decoration: () => variableMark,
});

export const variablePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorator.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = decorator.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
