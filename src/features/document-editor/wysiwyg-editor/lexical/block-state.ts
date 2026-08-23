import { $getState, $setState, createState, type LexicalNode } from 'lexical';
import { getUniqueId } from 'tinybase/with-schemas';

const persistentIdState = createState('persistentId', {
  parse: value => (typeof value === 'string' ? value : '')
});

function getPersistentId(node: LexicalNode): string {
  return $getState(node, persistentIdState);
}

export function ensurePersistentId(node: LexicalNode) {
  if (!getPersistentId(node)) {
    $setState(node, persistentIdState, getUniqueId());
  }
}
