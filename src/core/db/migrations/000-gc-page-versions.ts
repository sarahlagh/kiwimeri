/* eslint-disable @typescript-eslint/no-explicit-any */
import { NoSchemaStore } from '../types';

const C = 'collection';
const H = 'history';
const HC = 'history_content';
const RS = 'document_resume_state';
const S = 'stats';

export default function Migration(space: NoSchemaStore) {
  if (!space.hasTable(C)) return;
  if (!space.hasTable('history')) return;
  const collection = space.getTable(C);
  const history = space.getTable(H);
  const unknownVersions = new Set<string>();
  const unknownContentIds = new Map<string, string>();
  const leftoverPageIds = new Set<string>();

  // identify leftover pages
  space.getRowIds(C).forEach(rowId => {
    const row = collection[rowId];
    if (row.type === 'p') {
      console.warn('leftover page', {
        ...row,
        content: row.content?.toString().substring(0, 50)
      });
      delete collection[rowId];
      space.delRow(C, rowId);
    }
  });

  // identify orphaned pages
  space.getRowIds(H).forEach(rowId => {
    const row = history[rowId];
    if (!row.itemId) {
      console.warn('history row had no itemId', row);
      space.delRow(H, rowId);
      return;
    }
    if (row.pageVersionsArrayJson) {
      space.delCell(H, rowId, 'pageVersionsArrayJson');
      return;
    }
    const itemId = row.itemId as string;
    if (!collection[itemId]?.type) {
      // item doesn't exist anymore
      const snapshotJson = history[rowId].snapshotJson as any;
      if (!snapshotJson.title) {
        // no title, was likely a page
        leftoverPageIds.add(itemId);
        unknownVersions.add(rowId);
        unknownContentIds.set(rowId, row.contentId as string);
      }
    }
  });

  // content is unique per item id & content
  // so if its version is slated for deletion, because its item doesn't exist anymore, it should be true for content too
  const contentIds = new Set([...unknownContentIds.values()]);
  console.log(
    '[migration] found orphaned page versions',
    unknownVersions.size,
    contentIds.size
  );

  // delete those
  space.transaction(() => {
    unknownVersions.forEach(v => {
      space.delRow(H, v);
    });
    contentIds.forEach(v => {
      space.delRow(HC, v);
    });
    leftoverPageIds.forEach(i => {
      space.delRow(RS, i);
      space.getRowIds(S).forEach(rowId => {
        if (rowId.startsWith(i)) {
          space.delRow(S, rowId);
        }
      });
    });
  });
}
