/* eslint-disable @typescript-eslint/no-explicit-any */
import { NoSchemas, Store } from 'tinybase/with-schemas';

export default function Migration(space: Store<NoSchemas>) {
  if (!space.hasTable('collection')) return;
  if (!space.hasTable('history')) return;
  const collection = space.getTable('collection');
  const history = space.getTable('history');
  const unknownVersions = new Set<string>();
  const unknownContentIds = new Map<string, string>();

  // identify orphaned pages
  space.getRowIds('history').forEach(rowId => {
    const row = history[rowId];
    if (!row.itemId) {
      console.warn('history row had no itemId', row);
      space.delRow('history', rowId);
      return;
    }
    const itemId = row.itemId as string;
    if (!collection[itemId]?.type) {
      // item doesn't exist anymore
      const snapshotJson = JSON.parse(
        history[rowId].snapshotJson as string
      ) as any;
      if (!snapshotJson.title) {
        // no title, was likely a page
        unknownVersions.add(rowId);
        unknownContentIds.set(rowId, row.contentId as string);
      }
    }
  });

  // identify which pages don't belong to a document anymore
  space.getRowIds('history').forEach(rowId => {
    if (unknownVersions.has(rowId)) return;
    const row = history[rowId];
    if (row.pageVersionsArrayJson) {
      const pageVersions = JSON.parse(
        row.pageVersionsArrayJson as string
      ) as any[];
      for (const pv of pageVersions) {
        if (unknownVersions.has(pv.id)) {
          unknownVersions.delete(pv.id);
          unknownContentIds.delete(pv.id);
        }
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
      space.delRow('history', v);
    });
    contentIds.forEach(v => {
      space.delRow('history_content', v);
    });
  });
}
