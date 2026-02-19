import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";

export const searchHighlightEffect = StateEffect.define<DecorationSet>();

export const searchHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(searchHighlightEffect)) {
        return effect.value;
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const searchMatchDecoration = Decoration.mark({
  class: "cm-searchMatch",
});

export const searchMatchSelectedDecoration = Decoration.mark({
  class: "cm-searchMatch-selected",
});

export function getSearchHighlightExtension() {
  return searchHighlightField;
}
