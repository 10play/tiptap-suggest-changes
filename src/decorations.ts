import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Decoration } from "prosemirror-view";

function pilcrow() {
  const span = document.createElement("span");
  span.appendChild(document.createTextNode("¶"));
  return span;
}

export function getSuggestionDecorations(
  state?: EditorState | null,
): Decoration[] {
  if (!state) return [];

  const { deletion, insertion } = state.schema.marks;
  if (!deletion) {
    throw new Error(
      `Failed to apply tracked changes to node: schema does not contain deletion mark. Did you forget to add it?`,
    );
  }
  if (!insertion) {
    throw new Error(
      `Failed to apply tracked changes to node: schema does not contain insertion mark. Did you forget to add it?`,
    );
  }

  const changeDecorations: Decoration[] = [];
  let lastTextNode: Node | null = null;
  let lastTextNodeEndPos = 0;
  state.doc.descendants((node, pos) => {
    if (node.isTextblock && node.childCount) {
      if (node.children.every((child) => deletion.isInSet(child.marks))) {
        changeDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            "data-node-deletion": "true",
          }),
        );
      }
      if (node.children.every((child) => insertion.isInSet(child.marks))) {
        changeDecorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            "data-node-insertion": "true",
          }),
        );
      }
    }
    if (node.type.name !== "text") return true;
    const currentDeletionMark = node.marks.find(
      (mark) => mark.type === deletion,
    );
    const currentInsertionMark = node.marks.find(
      (mark) => mark.type === insertion,
    );

    const lastDeletionMark = lastTextNode?.marks.find(
      (mark) => mark.type === deletion,
    );
    const lastInsertionMark = lastTextNode?.marks.find(
      (mark) => mark.type === insertion,
    );
    const widgetPos = lastTextNodeEndPos;
    lastTextNode = node;
    lastTextNodeEndPos = pos + node.nodeSize;
    if (
      ((!currentDeletionMark || !lastDeletionMark) &&
        (!currentInsertionMark || !lastInsertionMark)) ||
      (currentDeletionMark?.attrs["id"] !== lastDeletionMark?.attrs["id"] &&
        currentInsertionMark?.attrs["id"] !== lastInsertionMark?.attrs["id"])
    ) {
      return true;
    }
    if (currentDeletionMark) {
      changeDecorations.push(
        Decoration.widget(widgetPos, pilcrow, {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          key: currentDeletionMark.attrs["id"],
          marks: [
            deletion.create({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              id: currentDeletionMark.attrs["id"],
            }),
          ],
        }),
      );
    }
    if (currentInsertionMark) {
      changeDecorations.push(
        Decoration.widget(widgetPos, pilcrow, {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          key: currentInsertionMark.attrs["id"],
          marks: [
            insertion.create({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              id: currentInsertionMark.attrs["id"],
            }),
          ],
        }),
      );
    }
    return true;
  });
  return changeDecorations;
}
