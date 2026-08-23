import {
  $getState,
  $setState,
  createState,
  SerializedEditorState,
  SerializedLexicalNode,
  type LexicalNode
} from 'lexical';
import { getUniqueId } from 'tinybase/with-schemas';

export const persistentIdState = createState('persistentId', {
  parse: value => (typeof value === 'string' ? value : '')
});

export function getPersistentId(node: LexicalNode): string {
  return $getState(node, persistentIdState);
}

export function ensurePersistentId(node: LexicalNode) {
  if (!$getState(node, persistentIdState)) {
    $setState(node, persistentIdState, getUniqueId());
  }
}

export function findIndexByPersistentId(
  editorState: SerializedEditorState,
  serializedNode: SerializedLexicalNode | undefined
) {
  if (!serializedNode) return undefined;
  const persistentId = serializedNode.$?.persistentId;
  if (!persistentId) return undefined;
  return editorState.root.children.findIndex(
    p => p.$?.persistentId === persistentId
  );
}
