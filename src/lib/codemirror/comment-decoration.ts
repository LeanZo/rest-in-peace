import { Decoration, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

function findCommentRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\") i += 2;
        else i++;
      }
      if (i < text.length) i++;
    } else if (text[i] === "/" && text[i + 1] === "/") {
      const start = i;
      i += 2;
      while (i < text.length && text[i] !== "\n") i++;
      ranges.push([start, i]);
    } else if (text[i] === "/" && text[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      if (i < text.length) i += 2;
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  return ranges;
}

const commentMark = Decoration.mark({ class: "cm-json-comment" });

export const jsonCommentPlugin = ViewPlugin.define(
  (view) => ({
    decorations: buildDecorations(view.state.doc.toString()),
    update(u: ViewUpdate) {
      if (u.docChanged) {
        this.decorations = buildDecorations(u.state.doc.toString());
      }
    },
  }),
  { decorations: (v) => v.decorations },
);

function buildDecorations(text: string) {
  const builder = new RangeSetBuilder<Decoration>();
  for (const [start, end] of findCommentRanges(text)) {
    builder.add(start, end, commentMark);
  }
  return builder.finish();
}
