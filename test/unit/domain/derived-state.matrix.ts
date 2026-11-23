import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { CollectionItem } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import {
  ItemViewRow,
  ProjectedItemStateRow
} from '@/domain/collection/derived-item-state';
import { annotsService } from '@/domain/collection/doc-annotations.service';
import { DocAnnotation } from '@/domain/collection/document-annotations';
import {
  fakeTimersDelay,
  getNewContent,
  oneDocument,
  oneFolder,
  oneNote,
  oneNotebook
} from '@@/_setup/test.utils';

/**
 * bulk
 * bulk + 1: not0 createdAt
 * bulk + 2: doc0 createdAt, not0.lastActivityAt
 * bulk + 3: not1 createdAt, not0.lastActivityAt
 * bulk + 4: fol1 createdAt, not1.lastActivityAt, not0.lastActivityAt
 * bulk + 5: doc1 createdAt, fol1.lastActivityAt, not1.lastActivityAt, not0.lastActivityAt
 * bulk + 6: fol2 createdAt, fol1.lastActivityAt, not1.lastActivityAt, not0.lastActivityAt
 * bulk + 7: doc2 createdAt, fol2.lastActivityAt, fol1.lastActivityAt, not1.lastActivityAt, not0.lastActivityAt
 * bulk + 8: annot1 createdAt, doc1.updatedAt, fol1.lastActivityAt, not1.lastActivityAt, not0.lastActivityAt
 */
function initData() {
  const not0 = oneNotebook(); // bulk + 1
  const doc0 = oneDocument(); // bulk + 2
  doc0.id = 'doc0';
  doc0.content = getNewContent('doc0 preview');
  const not1 = oneNotebook('n', '1'); // bulk + 3
  not1.parentId = DEFAULT_NOTEBOOK_ID;
  const fol1 = oneFolder('f1', '1'); // bulk + 4
  fol1.id = 'fol1';
  const doc1 = oneDocument('d1', fol1.id); // bulk + 5
  doc1.id = 'doc1';
  doc1.content = getNewContent('doc1 preview');
  const fol2 = oneFolder('f2', fol1.id); // bulk + 6
  fol2.id = 'fol2';
  const doc2 = oneDocument('d2', fol2.id); // bulk + 7
  doc2.id = 'doc2';
  doc2.content = getNewContent('doc2 preview');
  const note = oneNote(doc1.id); // bulk + 8
  doc1.updatedAt = note.updatedAt;
  const items = [not0, doc0, not1, fol1, doc1, fol2, doc2];
  note.id = 'annot1';
  note.content = getNewContent('note preview');
  return {
    items,
    notes: [note],
    updatedAt: note.updatedAt
  };
}

type Scenario = {
  description: string;
  appliesToSaveItems?: boolean;
  applyLocalData?: () => void;
  applyNewData?: () => void; // individual action, no bulk
  generateRemoteData: () => {
    // returns data to be applied in bulk (saveItems, restore json, sync)
    items: CollectionItem[];
    notes: DocAnnotation[];
    updatedAt: number;
  };
  expected: (
    bulkTs: number,
    updateTs?: number
  ) => {
    [rowId: string]: Partial<ProjectedItemStateRow> &
      Pick<ItemViewRow, 'previewText'> &
      Pick<CollectionItem, 'createdAt' | 'updatedAt'>;
  };
};

export function getLocalSpaceDataForDerivedStateMatrix() {
  const collection = space.getTable(SpaceTables.Collection);
  const annotations = space.getTable(SpaceTables.Annotations);
  const projectedState = space.getTable(SpaceTables.ProjectedState);
  const itemView = space.getTable(SpaceTables.CollectionItemView);
  const annotView = space.getTable(SpaceTables.AnnotationView);

  const result: any = {};
  Object.keys(collection).forEach(rowId => {
    result[rowId] = {
      createdAt: collection[rowId].createdAt,
      updatedAt: collection[rowId].updatedAt
    };
  });
  Object.keys(annotations).forEach(rowId => {
    result[rowId] = {
      ...result[rowId],
      createdAt: annotations[rowId].createdAt,
      updatedAt: annotations[rowId].updatedAt
    };
  });
  Object.keys(projectedState).forEach(rowId => {
    result[rowId] = {
      ...result[rowId],
      fullPath: projectedState[rowId].fullPath,
      shortPath: projectedState[rowId].shortPath,
      lastActivityAt: projectedState[rowId].lastActivityAt
    };
  });
  Object.keys(itemView).forEach(rowId => {
    result[rowId] = {
      ...result[rowId],
      previewText: itemView[rowId].previewText
    };
  });
  Object.keys(annotView).forEach(rowId => {
    result[rowId] = {
      ...result[rowId],
      previewText: annotView[rowId].previewText
    };
  });
  return result;
}

function ts(bulk: number, n = 0) {
  return bulk + n * fakeTimersDelay;
}

function _ts(bulk?: number, n = 0) {
  if (bulk === undefined) return undefined;
  return bulk + n * fakeTimersDelay;
}

/**
 * * derived states:
 * collection's projected state: fullPath, shortPath, lastActivityAt
 * collection's view: previewText
 * annotation's view: previewText
 *
 * * scenarios: an item is
 * - added
 * - updated (row update)
 * - updated (non-row update)
 * - moved next to more recent item
 * - moved next to less recent items
 * - moved, old parent has more recent siblings
 * - moved, old parent doesn't have more recent siblings
 * - deleted, parent has more recent siblings
 * - deleted, parent doesn't have more recent siblings
 * - deleted with children
 */
export const derivedStatesScenarios: Scenario[] = [
  {
    description: 'a new folder and sub leaf are created at the same time',
    generateRemoteData: initData,
    expected(bulk) {
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: ts(bulk, 7),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description: 'a document is added',
    applyLocalData() {
      const { items, notes } = initData();
      items.pop(); // remove last (doc2)
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      // eqv of collectionService.addDocument('fol2');
      vi.advanceTimersByTime(fakeTimersDelay);
      const { item } = collectionService.getNewDocumentObj('fol2');
      item.content = getNewContent('doc2 preview');
      collectionService.saveItem(item, 'doc2');
    },
    generateRemoteData: initData,
    expected(bulk, single) {
      // item (doc2): new breadcrumb, lastActivityAt, previewText
      // parents (fol2, fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: _ts(single, 1) || ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: _ts(single, 1) || ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: _ts(single, 1) || ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: _ts(single, 1) || ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: _ts(single, 1) || ts(bulk, 7),
          updatedAt: _ts(single, 1) || ts(bulk, 7),
          lastActivityAt: _ts(single, 1) || ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description: 'a folder is added',
    applyLocalData() {
      const { items, notes } = initData();
      items.pop(); // removes last (doc2)
      items.pop(); // removes last (fol2)
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      {
        vi.advanceTimersByTime(fakeTimersDelay);
        const { item } = collectionService.getNewFolderObj('fol1');
        collectionService.saveItem(item, 'fol2');
      }
      {
        vi.advanceTimersByTime(fakeTimersDelay);
        const { item } = collectionService.getNewDocumentObj('fol2');
        item.content = getNewContent('doc2 preview');
        collectionService.saveItem(item, 'doc2');
      }
    },
    generateRemoteData: initData,
    expected(bulk, single) {
      // items (fol2, doc2): new breadcrumb, lastActivityAt, previewText for doc2
      // parents (fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: _ts(single, 2) || ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: _ts(single, 2) || ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: _ts(single, 2) || ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: _ts(single, 1) || ts(bulk, 6),
          updatedAt: _ts(single, 1) || ts(bulk, 6),
          lastActivityAt: _ts(single, 2) || ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: _ts(single, 2) || ts(bulk, 7),
          updatedAt: _ts(single, 2) || ts(bulk, 7),
          lastActivityAt: _ts(single, 2) || ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description:
      'a document is updated with a field that triggers lastActivityAt bump',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemField(
        'doc2',
        'content',
        getNewContent('doc2 preview updated')
      );
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const updatedAt = Date.now();
      const doc2 = data.items[data.items.length - 1];
      doc2.content = getNewContent('doc2 preview updated');
      doc2.content_meta!._u = updatedAt;
      doc2.updatedAt = updatedAt;
      return data;
    },
    expected(bulk, single) {
      // item (doc2): breadcrumb unchanged, lastActivityAt bumped, new previewText
      // parents (fol2, fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: _ts(single, 1) || ts(bulk, 9),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview updated'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description:
      'a folder is updated with a field that triggers lastActivityAt bump',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemTitle('fol2', 'new title');
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const updatedAt = Date.now();
      const fol2 = data.items[data.items.length - 2];
      fol2.title = 'new title';
      fol2.title_meta._u = updatedAt;
      fol2.updatedAt = updatedAt;
      return data;
    },
    expected(bulk, single) {
      // item (fol2): breadcrumb unchanged, lastActivityAt bumped
      // child (doc2): no changes
      // parents (fol2, fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: _ts(single, 1) || ts(bulk, 9),
          lastActivityAt: _ts(single, 1) || ts(bulk, 9),
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: ts(bulk, 7),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description:
      'a document is moved to a parent whose lastActivityAt is more recent',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc2', 'fol1');
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const doc2 = data.items[data.items.length - 1];
      doc2.parentId = 'fol1';
      doc2.parentId_meta._u = Date.now();
      return data;
    },
    expected(bulk) {
      // item (doc2): breadcrumb changed, lastActivityAt not bumped
      // old parent (fol2): lastActivityAt downgraded
      // new parents (fol1, not1, n0): unchanged, because (bulk, 7) < (bulk, 8)
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: ts(bulk, 6), // downgraded
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: ts(bulk, 7),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'doc2'],
          shortPath: ['1', 'fol1', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description:
      'a document is moved to a parent whose lastActivityAt was older',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc1', 'fol2');
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const doc1 = data.items[4];
      doc1.parentId = 'fol2';
      doc1.parentId_meta._u = Date.now();
      return data;
    },
    expected(bulk) {
      // item (doc1): breadcrumb changed, lastActivityAt not bumped
      // its annot: unchanged
      // old parents (fol1, not1, n0): lastActivityAt unchanged, because fol2 is under fol1
      // new parent (fol2): lastActivityAt bumped, because (bulk, 7) > (bulk, 8)
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc1'],
          shortPath: ['1', 'fol1', 'fol2', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: ts(bulk, 8), // bumped
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: ts(bulk, 7),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
          shortPath: ['1', 'fol1', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description: 'a folder is moved',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('fol2', DEFAULT_NOTEBOOK_ID);
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const fol2 = data.items[data.items.length - 2];
      fol2.parentId = DEFAULT_NOTEBOOK_ID;
      fol2.parentId_meta._u = Date.now();
      return data;
    },
    expected(bulk) {
      // item (fol2): breadcrumb changed, lastActivityAt not bumped
      // child (doc2): breadcrumb changed, lastActivityAt not bumped
      // old parents (fol1, not1, n0): unchanged
      // new parent (n0): unchanged, because because (bulk, 7) < (bulk, 8)
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8), // because of the annot
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', 'fol2'],
          shortPath: ['0', 'fol2']
        },
        doc2: {
          createdAt: ts(bulk, 7),
          updatedAt: ts(bulk, 7),
          lastActivityAt: ts(bulk, 7),
          fullPath: ['0', 'fol2', 'doc2'],
          shortPath: ['0', 'fol2', 'doc2'],
          previewText: 'doc2 preview'
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  },
  {
    description: 'a document is deleted',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
      annotsService.saveNotes(notes[0].parentId, notes);
    },
    applyNewData() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('doc2');
    },
    generateRemoteData() {
      const data = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      data.items.pop(); // removes doc2
      return data;
    },
    expected(bulk) {
      // item (doc2): no data left
      // parent fol2: no other docs left, lastActivityAt downgraded
      // other parents (fol1, not1, n0): lastActivityAt unchanged (doc1 still exists and is more recent)
      return {
        '0': {
          createdAt: ts(bulk, 1),
          updatedAt: ts(bulk, 1),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0'],
          shortPath: ['0']
        },
        doc0: {
          createdAt: ts(bulk, 2),
          updatedAt: ts(bulk, 2),
          lastActivityAt: ts(bulk, 2),
          fullPath: ['0', 'doc0'],
          shortPath: ['0', 'doc0'],
          previewText: 'doc0 preview'
        },
        '1': {
          createdAt: ts(bulk, 3),
          updatedAt: ts(bulk, 3),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1'],
          shortPath: ['1']
        },
        fol1: {
          createdAt: ts(bulk, 4),
          updatedAt: ts(bulk, 4),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1'],
          shortPath: ['1', 'fol1']
        },
        doc1: {
          createdAt: ts(bulk, 5),
          updatedAt: ts(bulk, 8),
          lastActivityAt: ts(bulk, 8),
          fullPath: ['0', '1', 'fol1', 'doc1'],
          shortPath: ['1', 'fol1', 'doc1'],
          previewText: 'doc1 preview'
        },
        fol2: {
          createdAt: ts(bulk, 6),
          updatedAt: ts(bulk, 6),
          lastActivityAt: ts(bulk, 6), // downgraded
          fullPath: ['0', '1', 'fol1', 'fol2'],
          shortPath: ['1', 'fol1', 'fol2']
        },
        annot1: {
          createdAt: ts(bulk, 8),
          updatedAt: ts(bulk, 8),
          previewText: 'note preview'
        }
      };
    }
  }
  /**
   *  * - moved next to more recent item
   * - moved next to less recent items
   * - moved, old parent has more recent siblings
   * - moved, old parent doesn't have more recent siblings
   */
  // a document is deleted, doesn't downgrade parent
  // a document is updated with a field that skips lastActivityAt bump (order)
  // a folder is deleted, downgrades parent
  // a folder is updated with a field that skips lastActivityAt bump (order)
  // a notebook is added / updated / moved / deleted
  // an annotation is added
  // an annotation is updated with a field that triggers lastActivityAt bump
  // an annotation is updated with a field that skips lastActivityAt bump (order)
  // an annotation is deleted

  // suggestions:
  // add nested folder with existing subtree
  // delete folder containing the most recently active document
  // moves:
  // Moving to root.
  // Moving between unrelated branches.
  // Moving a folder containing several levels of descendants.
  // Moving a folder whose activity timestamp is the maximum in its old hierarchy.
];
