import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
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
import notebooksService from '@/domain/collection/notebooks.service';
import {
  fakeTimersDelay,
  getNewContent,
  getNewParsedContent,
  oneDocument,
  oneFolder,
  oneNote,
  oneNotebook
} from '@@/_setup/test.utils';

type Scenario = {
  description: string;
  appliesToSaveItems?: boolean;
  applyLocalData?: () => void;
  singleOperation?: () => void; // individual action, no bulk
  bulkOperation: () => {
    // returns data to be applied in bulk (saveItems, restore json, sync)
    items: CollectionItem[];
    notes: DocAnnotation[];
    updatedAt: number;
  };
  expected: (bulkTs: number) => {
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

function _ts(bulk: number, n = 0) {
  return bulk + (21 + n) * fakeTimersDelay;
}

// export const derivedStatesScenariosOld: Scenario[] = [
//   {
//     description: 'a folder is added',
//     applyLocalData() {
//       const { items, notes } = initDataOld();
//       items.pop(); // removes last (doc2)
//       items.pop(); // removes last (fol2)
//       collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
//       annotsService.saveNotesForDoc(notes[0].parentId, notes);
//     },
//     singleOperation() {
//       {
//         vi.advanceTimersByTime(fakeTimersDelay);
//         const { item } = collectionService.getNewFolderObj('fol1');
//         collectionService.saveItem(item, 'fol2');
//       }
//       {
//         vi.advanceTimersByTime(fakeTimersDelay);
//         const { item } = collectionService.getNewDocumentObj('fol2');
//         item.content = getNewContent('doc2 preview');
//         collectionService.saveItem(item, 'doc2');
//       }
//     },
//     bulkOperation: initDataOld,
//     expected(bulk, single) {
//       // items (fol2, doc2): new breadcrumb, lastActivityAt, previewText for doc2
//       // parents (fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
//       return {
//         '0': {
//           createdAt: ts(bulk, 1),
//           updatedAt: ts(bulk, 1),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 8),
//           fullPath: ['0'],
//           shortPath: ['0']
//         },
//         doc0: {
//           createdAt: ts(bulk, 2),
//           updatedAt: ts(bulk, 2),
//           lastActivityAt: ts(bulk, 2),
//           fullPath: ['0', 'doc0'],
//           shortPath: ['0', 'doc0'],
//           previewText: 'doc0 preview'
//         },
//         '1': {
//           createdAt: ts(bulk, 3),
//           updatedAt: ts(bulk, 3),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 8),
//           fullPath: ['0', '1'],
//           shortPath: ['1']
//         },
//         fol1: {
//           createdAt: ts(bulk, 4),
//           updatedAt: ts(bulk, 4),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1'],
//           shortPath: ['1', 'fol1']
//         },
//         doc1: {
//           createdAt: ts(bulk, 5),
//           updatedAt: ts(bulk, 8), // because of the annot
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1', 'doc1'],
//           shortPath: ['1', 'fol1', 'doc1'],
//           previewText: 'doc1 preview'
//         },
//         fol2: {
//           createdAt: ___ts(single, 1) || ts(bulk, 6),
//           updatedAt: ___ts(single, 1) || ts(bulk, 6),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 7),
//           fullPath: ['0', '1', 'fol1', 'fol2'],
//           shortPath: ['1', 'fol1', 'fol2']
//         },
//         doc2: {
//           createdAt: ___ts(single, 2) || ts(bulk, 7),
//           updatedAt: ___ts(single, 2) || ts(bulk, 7),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 7),
//           fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
//           shortPath: ['1', 'fol1', 'fol2', 'doc2'],
//           previewText: 'doc2 preview'
//         },
//         annot1: {
//           createdAt: ts(bulk, 8),
//           updatedAt: ts(bulk, 8),
//           previewText: 'note preview'
//         }
//       };
//     }
//   },
//   {
//     description: 'a notebook is added',
//     applyLocalData() {
//       const { items, notes } = initDataOld();
//       items.splice(2, 1); // delete notebook 1
//       collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
//       annotsService.saveNotesForDoc(notes[0].parentId, notes);
//     },
//     singleOperation() {
//       vi.advanceTimersByTime(fakeTimersDelay);
//       const { item } = notebooksService.getNewNotebookObj(
//         DEFAULT_NOTEBOOK_ID,
//         '1'
//       );
//       collectionService.saveItem(item, '1');
//     },
//     bulkOperation: initDataOld,
//     expected(bulk, single) {
//       // items (n1): new breadcrumb, lastActivityAt
//       // parents (n0): no breadcrumb change, lastActivityAt bumped
//       return {
//         '0': {
//           createdAt: ts(bulk, 1),
//           updatedAt: ts(bulk, 1),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 8),
//           fullPath: ['0'],
//           shortPath: ['0']
//         },
//         doc0: {
//           createdAt: ts(bulk, 2),
//           updatedAt: ts(bulk, 2),
//           lastActivityAt: ts(bulk, 2),
//           fullPath: ['0', 'doc0'],
//           shortPath: ['0', 'doc0'],
//           previewText: 'doc0 preview'
//         },
//         '1': {
//           createdAt: ___ts(single, 1) || ts(bulk, 3),
//           updatedAt: ___ts(single, 1) || ts(bulk, 3),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 8),
//           fullPath: ['0', '1'],
//           shortPath: ['1']
//         },
//         fol1: {
//           createdAt: ts(bulk, 4),
//           updatedAt: ts(bulk, 4),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1'],
//           shortPath: ['1', 'fol1']
//         },
//         doc1: {
//           createdAt: ts(bulk, 5),
//           updatedAt: ts(bulk, 8), // because of the annot
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1', 'doc1'],
//           shortPath: ['1', 'fol1', 'doc1'],
//           previewText: 'doc1 preview'
//         },
//         fol2: {
//           createdAt: ___ts(single, 1) || ts(bulk, 6),
//           updatedAt: ___ts(single, 1) || ts(bulk, 6),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 7),
//           fullPath: ['0', '1', 'fol1', 'fol2'],
//           shortPath: ['1', 'fol1', 'fol2']
//         },
//         doc2: {
//           createdAt: ___ts(single, 2) || ts(bulk, 7),
//           updatedAt: ___ts(single, 2) || ts(bulk, 7),
//           lastActivityAt: ___ts(single, 2) || ts(bulk, 7),
//           fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
//           shortPath: ['1', 'fol1', 'fol2', 'doc2'],
//           previewText: 'doc2 preview'
//         },
//         annot1: {
//           createdAt: ts(bulk, 8),
//           updatedAt: ts(bulk, 8),
//           previewText: 'note preview'
//         }
//       };
//     }
//   },
//   {
//     description:
//       'a folder is updated with a field that triggers lastActivityAt bump',
//     applyLocalData() {
//       const { items, notes } = initDataOld();
//       collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
//       annotsService.saveNotesForDoc(notes[0].parentId, notes);
//     },
//     singleOperation() {
//       vi.advanceTimersByTime(fakeTimersDelay);
//       collectionService.setItemTitle('fol2', 'new title');
//     },
//     bulkOperation() {
//       const data = initDataOld();
//       vi.advanceTimersByTime(fakeTimersDelay);
//       const updatedAt = Date.now();
//       const fol2 = data.items[data.items.length - 2];
//       fol2.title = 'new title';
//       fol2.title_meta._u = updatedAt;
//       fol2.updatedAt = updatedAt;
//       return data;
//     },
//     expected(bulk, single) {
//       // item (fol2): breadcrumb unchanged, lastActivityAt bumped
//       // child (doc2): no changes
//       // parents (fol2, fol1, not1, n0): no breadcrumb change, lastActivityAt bumped
//       return {
//         '0': {
//           createdAt: ts(bulk, 1),
//           updatedAt: ts(bulk, 1),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 9),
//           fullPath: ['0'],
//           shortPath: ['0']
//         },
//         doc0: {
//           createdAt: ts(bulk, 2),
//           updatedAt: ts(bulk, 2),
//           lastActivityAt: ts(bulk, 2),
//           fullPath: ['0', 'doc0'],
//           shortPath: ['0', 'doc0'],
//           previewText: 'doc0 preview'
//         },
//         '1': {
//           createdAt: ts(bulk, 3),
//           updatedAt: ts(bulk, 3),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 9),
//           fullPath: ['0', '1'],
//           shortPath: ['1']
//         },
//         fol1: {
//           createdAt: ts(bulk, 4),
//           updatedAt: ts(bulk, 4),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 9),
//           fullPath: ['0', '1', 'fol1'],
//           shortPath: ['1', 'fol1']
//         },
//         doc1: {
//           createdAt: ts(bulk, 5),
//           updatedAt: ts(bulk, 8), // because of the annot
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1', 'doc1'],
//           shortPath: ['1', 'fol1', 'doc1'],
//           previewText: 'doc1 preview'
//         },
//         fol2: {
//           createdAt: ts(bulk, 6),
//           updatedAt: ___ts(single, 1) || ts(bulk, 9),
//           lastActivityAt: ___ts(single, 1) || ts(bulk, 9),
//           fullPath: ['0', '1', 'fol1', 'fol2'],
//           shortPath: ['1', 'fol1', 'fol2']
//         },
//         doc2: {
//           createdAt: ts(bulk, 7),
//           updatedAt: ts(bulk, 7),
//           lastActivityAt: ts(bulk, 7),
//           fullPath: ['0', '1', 'fol1', 'fol2', 'doc2'],
//           shortPath: ['1', 'fol1', 'fol2', 'doc2'],
//           previewText: 'doc2 preview'
//         },
//         annot1: {
//           createdAt: ts(bulk, 8),
//           updatedAt: ts(bulk, 8),
//           previewText: 'note preview'
//         }
//       };
//     }
//   },
//   {
//     description: 'a folder is moved',
//     applyLocalData() {
//       const { items, notes } = initDataOld();
//       collectionService.saveItems(items); // relies on saveItems & saveNotes being tested independently
//       annotsService.saveNotesForDoc(notes[0].parentId, notes);
//     },
//     singleOperation() {
//       vi.advanceTimersByTime(fakeTimersDelay);
//       collectionService.setItemParent('fol2', DEFAULT_NOTEBOOK_ID);
//     },
//     bulkOperation() {
//       const data = initDataOld();
//       vi.advanceTimersByTime(fakeTimersDelay);
//       const fol2 = data.items[data.items.length - 2];
//       fol2.parentId = DEFAULT_NOTEBOOK_ID;
//       fol2.parentId_meta._u = Date.now();
//       return data;
//     },
//     expected(bulk) {
//       // item (fol2): breadcrumb changed, lastActivityAt not bumped
//       // child (doc2): breadcrumb changed, lastActivityAt not bumped
//       // old parents (fol1, not1, n0): unchanged
//       // new parent (n0): unchanged, because because (bulk, 7) < (bulk, 8)
//       return {
//         '0': {
//           createdAt: ts(bulk, 1),
//           updatedAt: ts(bulk, 1),
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0'],
//           shortPath: ['0']
//         },
//         doc0: {
//           createdAt: ts(bulk, 2),
//           updatedAt: ts(bulk, 2),
//           lastActivityAt: ts(bulk, 2),
//           fullPath: ['0', 'doc0'],
//           shortPath: ['0', 'doc0'],
//           previewText: 'doc0 preview'
//         },
//         '1': {
//           createdAt: ts(bulk, 3),
//           updatedAt: ts(bulk, 3),
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1'],
//           shortPath: ['1']
//         },
//         fol1: {
//           createdAt: ts(bulk, 4),
//           updatedAt: ts(bulk, 4),
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1'],
//           shortPath: ['1', 'fol1']
//         },
//         doc1: {
//           createdAt: ts(bulk, 5),
//           updatedAt: ts(bulk, 8), // because of the annot
//           lastActivityAt: ts(bulk, 8),
//           fullPath: ['0', '1', 'fol1', 'doc1'],
//           shortPath: ['1', 'fol1', 'doc1'],
//           previewText: 'doc1 preview'
//         },
//         fol2: {
//           createdAt: ts(bulk, 6),
//           updatedAt: ts(bulk, 6),
//           lastActivityAt: ts(bulk, 7),
//           fullPath: ['0', 'fol2'],
//           shortPath: ['0', 'fol2']
//         },
//         doc2: {
//           createdAt: ts(bulk, 7),
//           updatedAt: ts(bulk, 7),
//           lastActivityAt: ts(bulk, 7),
//           fullPath: ['0', 'fol2', 'doc2'],
//           shortPath: ['0', 'fol2', 'doc2'],
//           previewText: 'doc2 preview'
//         },
//         annot1: {
//           createdAt: ts(bulk, 8),
//           updatedAt: ts(bulk, 8),
//           previewText: 'note preview'
//         }
//       };
//     }
//   },
// ];

function initData() {
  const items: CollectionItem[] = [];
  const notes: DocAnnotation[] = [];
  const N0 = oneNotebook(); // bulk + 1
  items.push(N0);
  const N1 = oneNotebook('N1', DEFAULT_NOTEBOOK_ID, 'N1'); // bulk + 1
  items.push(N1);
  const N2 = oneNotebook('N2', DEFAULT_NOTEBOOK_ID, 'N2'); // bulk + 2
  items.push(N2);
  const fol1 = oneFolder('fol1', 'N2', 'fol1'); // bulk + 3
  items.push(fol1);
  const fol2 = oneFolder('fol2', 'N2', 'fol2'); // bulk + 4
  items.push(fol2);
  const doc1 = oneDocument('doc1', 'fol2', 'doc1'); // bulk + 5
  doc1.content = getNewContent('doc1 preview');
  const annot1 = oneNote('doc1', 'annot1'); // bulk + 6
  annot1.content = getNewContent('annot1 preview');
  doc1.updatedAt = annot1.updatedAt;
  items.push(doc1);
  notes.push(annot1);
  const doc2 = oneDocument('doc2', 'fol2', 'doc2'); // bulk + 7
  doc2.content = getNewContent('doc2 preview');
  items.push(doc2);
  const doc3 = oneDocument('doc3', 'fol2', 'doc3'); // bulk + 8
  doc3.content = getNewContent('doc3 preview');
  items.push(doc3);
  const fol3 = oneFolder('fol3', 'N2', 'fol3'); // bulk + 9
  items.push(fol3);
  const N3 = oneNotebook('N3', DEFAULT_NOTEBOOK_ID, 'N3'); // bulk + 10
  items.push(N3);
  const doc4 = oneDocument('doc4', 'N3', 'doc4'); // bulk + 11
  doc4.content = getNewContent('doc4 preview');
  items.push(doc4);
  const N4 = oneNotebook('N4', 'N1', 'N4'); // bulk + 12
  items.push(N4);
  const N5 = oneNotebook('N5', ROOT_COLLECTION, 'N5'); // bulk + 13
  items.push(N5);
  const N6 = oneNotebook('N6', ROOT_COLLECTION, 'N6'); // bulk + 14
  items.push(N6);
  const fol4 = oneFolder('fol4', 'N6', 'fol4'); // bulk + 15
  items.push(fol4);
  const fol5 = oneFolder('fol5', 'N6', 'fol5'); // bulk + 16
  items.push(fol5);
  const doc5 = oneDocument('doc5', 'fol5', 'doc5'); // bulk + 17
  doc5.content = getNewContent('doc5 preview');
  const doc6 = oneDocument('doc6', 'fol5', 'doc6'); // bulk + 18
  doc6.content = getNewContent('doc6 preview');
  items.push(doc6);
  const annot2 = oneNote('doc5', 'annot2'); // bulk + 19
  annot2.content = getNewContent('annot2 preview');
  notes.push(annot2);
  doc5.updatedAt = annot2.updatedAt;
  items.push(doc5);
  const doc7 = oneDocument('doc7', 'fol4', 'doc7'); // bulk + 20
  doc7.content = getNewContent('doc7 preview');
  items.push(doc7);
  return {
    items,
    notes,
    updatedAt: doc7.updatedAt
  };
}

/**
 * derived states:
 * collection's projected state: fullPath, shortPath, lastActivityAt
 * collection's view: previewText
 * annotation's view: previewText
 * see derived-state.matrix.md
 */
const baseData = (bulk: number) => ({
  '0': {
    createdAt: ts(bulk, 1),
    updatedAt: ts(bulk, 1),
    lastActivityAt: ts(bulk, 13),
    fullPath: ['0'],
    shortPath: ['0']
  },
  N1: {
    createdAt: ts(bulk, 2),
    updatedAt: ts(bulk, 2),
    lastActivityAt: ts(bulk, 13),
    fullPath: ['0', 'N1'],
    shortPath: ['N1']
  },
  N2: {
    createdAt: ts(bulk, 3),
    updatedAt: ts(bulk, 3),
    lastActivityAt: ts(bulk, 10),
    fullPath: ['0', 'N2'],
    shortPath: ['N2']
  },
  fol1: {
    createdAt: ts(bulk, 4),
    updatedAt: ts(bulk, 4),
    lastActivityAt: ts(bulk, 4),
    fullPath: ['0', 'N2', 'fol1'],
    shortPath: ['N2', 'fol1']
  },
  fol2: {
    createdAt: ts(bulk, 5),
    updatedAt: ts(bulk, 5),
    lastActivityAt: ts(bulk, 9),
    fullPath: ['0', 'N2', 'fol2'],
    shortPath: ['N2', 'fol2']
  },
  doc1: {
    createdAt: ts(bulk, 6),
    updatedAt: ts(bulk, 7),
    lastActivityAt: ts(bulk, 7),
    fullPath: ['0', 'N2', 'fol2', 'doc1'],
    shortPath: ['N2', 'fol2', 'doc1'],
    previewText: 'doc1 preview'
  },
  annot1: {
    createdAt: ts(bulk, 7),
    updatedAt: ts(bulk, 7),
    previewText: 'annot1 preview'
  },
  doc2: {
    createdAt: ts(bulk, 8),
    updatedAt: ts(bulk, 8),
    lastActivityAt: ts(bulk, 8),
    fullPath: ['0', 'N2', 'fol2', 'doc2'],
    shortPath: ['N2', 'fol2', 'doc2'],
    previewText: 'doc2 preview'
  },
  doc3: {
    createdAt: ts(bulk, 9),
    updatedAt: ts(bulk, 9),
    lastActivityAt: ts(bulk, 9),
    fullPath: ['0', 'N2', 'fol2', 'doc3'],
    shortPath: ['N2', 'fol2', 'doc3'],
    previewText: 'doc3 preview'
  },
  fol3: {
    createdAt: ts(bulk, 10),
    updatedAt: ts(bulk, 10),
    lastActivityAt: ts(bulk, 10),
    fullPath: ['0', 'N2', 'fol3'],
    shortPath: ['N2', 'fol3']
  },
  N3: {
    createdAt: ts(bulk, 11),
    updatedAt: ts(bulk, 11),
    lastActivityAt: ts(bulk, 12),
    fullPath: ['0', 'N3'],
    shortPath: ['N3']
  },
  doc4: {
    createdAt: ts(bulk, 12),
    updatedAt: ts(bulk, 12),
    lastActivityAt: ts(bulk, 12),
    fullPath: ['0', 'N3', 'doc4'],
    shortPath: ['N3', 'doc4'],
    previewText: 'doc4 preview'
  },
  N4: {
    createdAt: ts(bulk, 13),
    updatedAt: ts(bulk, 13),
    lastActivityAt: ts(bulk, 13),
    fullPath: ['0', 'N1', 'N4'],
    shortPath: ['N4']
  },
  N5: {
    createdAt: ts(bulk, 14),
    updatedAt: ts(bulk, 14),
    lastActivityAt: ts(bulk, 14),
    fullPath: ['N5'],
    shortPath: ['N5']
  },
  N6: {
    createdAt: ts(bulk, 15),
    updatedAt: ts(bulk, 15),
    lastActivityAt: ts(bulk, 21),
    fullPath: ['N6'],
    shortPath: ['N6']
  },
  fol4: {
    createdAt: ts(bulk, 16),
    updatedAt: ts(bulk, 16),
    lastActivityAt: ts(bulk, 21),
    fullPath: ['N6', 'fol4'],
    shortPath: ['N6', 'fol4']
  },
  fol5: {
    createdAt: ts(bulk, 17),
    updatedAt: ts(bulk, 17),
    lastActivityAt: ts(bulk, 20),
    fullPath: ['N6', 'fol5'],
    shortPath: ['N6', 'fol5']
  },
  doc5: {
    createdAt: ts(bulk, 18),
    updatedAt: ts(bulk, 20),
    lastActivityAt: ts(bulk, 20),
    fullPath: ['N6', 'fol5', 'doc5'],
    shortPath: ['N6', 'fol5', 'doc5'],
    previewText: 'doc5 preview'
  },
  doc6: {
    createdAt: ts(bulk, 19),
    updatedAt: ts(bulk, 19),
    lastActivityAt: ts(bulk, 19),
    fullPath: ['N6', 'fol5', 'doc6'],
    shortPath: ['N6', 'fol5', 'doc6'],
    previewText: 'doc6 preview'
  },
  annot2: {
    createdAt: ts(bulk, 20),
    updatedAt: ts(bulk, 20),
    previewText: 'annot2 preview'
  },
  doc7: {
    createdAt: ts(bulk, 21),
    updatedAt: ts(bulk, 21),
    lastActivityAt: ts(bulk, 21),
    fullPath: ['N6', 'fol4', 'doc7'],
    shortPath: ['N6', 'fol4', 'doc7'],
    previewText: 'doc7 preview'
  }
});

export const documentScenarios: Scenario[] = [
  {
    description: 'add a document',
    applyLocalData() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'doc3');
      items.splice(idx, 1); // remove item
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      // eqv of collectionService.addDocument('fol2');
      vi.advanceTimersByTime(fakeTimersDelay);
      const { item } = collectionService.getNewDocumentObj('fol2');
      item.content = getNewContent('doc3 preview');
      collectionService.saveItem(item, 'doc3');
    },
    bulkOperation() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'doc3');
      const doc3 = oneDocument('doc3', 'fol2', 'doc3');
      doc3.content = getNewContent('doc3 preview');
      items.splice(idx, 1, doc3); // replaces doc3
      return { items, notes, updatedAt: doc3.updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc3'].createdAt = _ts(bulk, 1);
      base['doc3'].updatedAt = _ts(bulk, 1);
      base['doc3'].lastActivityAt = _ts(bulk, 1);
      base['fol2'].lastActivityAt = _ts(bulk, 1);
      base['N2'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  },
  {
    description: 'update document (row update, content)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemLexicalContent(
        'doc2',
        getNewParsedContent('doc2 preview updated')
      );
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const now = Date.now();
      const idx = items.findIndex(d => d.id === 'doc2');
      const doc2 = items[idx];
      doc2.content = getNewContent('doc2 preview updated');
      doc2.content_meta!._u = now;
      doc2.updatedAt = now;
      return { items, notes, updatedAt: now };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc2'].updatedAt = _ts(bulk, 1);
      base['doc2'].lastActivityAt = _ts(bulk, 1);
      base['fol2'].lastActivityAt = _ts(bulk, 1);
      base['N2'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      base['doc2'].previewText = 'doc2 preview updated';
      return base;
    }
  },
  {
    description: 'update document (non row update, order)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemField('doc2', 'order', 325);
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc2');
      const doc2 = items[idx];
      doc2.order = 325;
      doc2.order_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected: baseData
  },
  {
    description: "move document: wasn't the newest, is the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc2', 'fol1');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc2');
      const doc2 = items[idx];
      doc2.parentId = 'fol1';
      doc2.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc2'].fullPath = ['0', 'N2', 'fol1', 'doc2'];
      base['doc2'].shortPath = ['N2', 'fol1', 'doc2'];
      base['fol1'].lastActivityAt = base['doc2'].updatedAt;
      return base;
    }
  },
  {
    description: "move document: wasn't the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc2', 'N3');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc2');
      const doc2 = items[idx];
      doc2.parentId = 'N3';
      doc2.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc2'].fullPath = ['0', 'N3', 'doc2'];
      base['doc2'].shortPath = ['N3', 'doc2'];
      return base;
    }
  },
  {
    description: 'move document: was the newest, is the newest',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc7', 'fol5');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc7');
      const doc7 = items[idx];
      doc7.parentId = 'fol5';
      doc7.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc7'].fullPath = ['N6', 'fol5', 'doc7'];
      base['doc7'].shortPath = ['N6', 'fol5', 'doc7'];
      base['fol4'].lastActivityAt = base['fol4'].createdAt;
      base['fol5'].lastActivityAt = base['doc7'].updatedAt;
      return base;
    }
  },
  {
    description: "move document: was the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('doc3', 'N3');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc3');
      const doc3 = items[idx];
      doc3.parentId = 'N3';
      doc3.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['doc3'].fullPath = ['0', 'N3', 'doc3'];
      base['doc3'].shortPath = ['N3', 'doc3'];
      base['fol2'].lastActivityAt = base['doc2'].createdAt;
      return base;
    }
  },
  {
    description: 'delete document: was the newest',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('doc7');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc7');
      items.splice(idx, 1);
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['doc7'];
      base['fol4'].lastActivityAt = base['fol4'].createdAt;
      base['N6'].lastActivityAt = base['annot2'].createdAt;
      return base;
    }
  },
  {
    description: "delete document: wasn't the newest",
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('doc6');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'doc6');
      items.splice(idx, 1);
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['doc6'];
      return base;
    }
  }
];

export const folderScenarios: Scenario[] = [
  {
    description: 'add a folder',
    applyLocalData() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'fol3');
      items.splice(idx, 1); // remove item
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      const { item } = collectionService.getNewFolderObj('N2');
      collectionService.saveItem(item, 'fol3');
    },
    bulkOperation() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'fol3');
      const fol3 = oneFolder('fol3', 'N2', 'fol3');
      items.splice(idx, 1, fol3); // replaces item
      return { items, notes, updatedAt: fol3.updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol3'].createdAt = _ts(bulk, 1);
      base['fol3'].updatedAt = _ts(bulk, 1);
      base['fol3'].lastActivityAt = _ts(bulk, 1);
      base['N2'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  },
  {
    description: 'update folder (row update, title)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemTitle('fol2', 'new fol2 title');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const now = Date.now();
      const idx = items.findIndex(d => d.id === 'fol2');
      const fol2 = items[idx];
      fol2.title = 'new fol2 title';
      fol2.title_meta._u = now;
      fol2.updatedAt = now;
      return { items, notes, updatedAt: now };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol2'].updatedAt = _ts(bulk, 1);
      base['fol2'].lastActivityAt = _ts(bulk, 1);
      base['N2'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  },
  {
    description: 'update folder (non row update, order)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemField('fol2', 'order', 325);
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol2');
      const fol2 = items[idx];
      fol2.order = 325;
      fol2.order_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected: baseData
  },
  {
    description: "move folder: wasn't the newest, is the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('fol2', 'fol1');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol2');
      const fol2 = items[idx];
      fol2.parentId = 'fol1';
      fol2.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol2'].fullPath = ['0', 'N2', 'fol1', 'fol2'];
      base['fol2'].shortPath = ['N2', 'fol1', 'fol2'];
      base['doc1'].fullPath = ['0', 'N2', 'fol1', 'fol2', 'doc1'];
      base['doc1'].shortPath = ['N2', 'fol1', 'fol2', 'doc1'];
      base['doc2'].fullPath = ['0', 'N2', 'fol1', 'fol2', 'doc2'];
      base['doc2'].shortPath = ['N2', 'fol1', 'fol2', 'doc2'];
      base['doc3'].fullPath = ['0', 'N2', 'fol1', 'fol2', 'doc3'];
      base['doc3'].shortPath = ['N2', 'fol1', 'fol2', 'doc3'];
      base['fol1'].lastActivityAt = base['fol2'].lastActivityAt;
      return base;
    }
  },
  {
    description: "move folder: wasn't the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('fol2', 'fol3');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol2');
      const fol2 = items[idx];
      fol2.parentId = 'fol3';
      fol2.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol2'].fullPath = ['0', 'N2', 'fol3', 'fol2'];
      base['fol2'].shortPath = ['N2', 'fol3', 'fol2'];
      base['doc1'].fullPath = ['0', 'N2', 'fol3', 'fol2', 'doc1'];
      base['doc1'].shortPath = ['N2', 'fol3', 'fol2', 'doc1'];
      base['doc2'].fullPath = ['0', 'N2', 'fol3', 'fol2', 'doc2'];
      base['doc2'].shortPath = ['N2', 'fol3', 'fol2', 'doc2'];
      base['doc3'].fullPath = ['0', 'N2', 'fol3', 'fol2', 'doc3'];
      base['doc3'].shortPath = ['N2', 'fol3', 'fol2', 'doc3'];
      return base;
    }
  },
  {
    description: 'move folder: was the newest, is the newest',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('fol4', 'N5');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol4');
      const fol4 = items[idx];
      fol4.parentId = 'N5';
      fol4.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol4'].fullPath = ['N5', 'fol4'];
      base['fol4'].shortPath = ['N5', 'fol4'];
      base['doc7'].fullPath = ['N5', 'fol4', 'doc7'];
      base['doc7'].shortPath = ['N5', 'fol4', 'doc7'];
      base['N5'].lastActivityAt = base['fol4'].lastActivityAt;
      base['N6'].lastActivityAt = base['fol5'].lastActivityAt;
      return base;
    }
  },
  {
    description: "move folder: was the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('fol3', 'N3');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol3');
      const fol3 = items[idx];
      fol3.parentId = 'N3';
      fol3.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['fol3'].fullPath = ['0', 'N3', 'fol3'];
      base['fol3'].shortPath = ['N3', 'fol3'];
      base['N2'].lastActivityAt = base['fol2'].lastActivityAt;
      return base;
    }
  },
  {
    description: 'delete folder: was the newest',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('fol3');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol3');
      items.splice(idx, 1);
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['fol3'];
      base['N2'].lastActivityAt = base['doc3'].createdAt;
      return base;
    }
  },
  {
    description: "delete folder: wasn't the newest",
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('fol1');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'fol1');
      items.splice(idx, 1);
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['fol1'];
      return base;
    }
  },
  {
    description: 'delete folder: also delete children (was the newest)',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('fol4');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      ['fol4', 'doc7'].forEach(id => {
        const idx = items.findIndex(d => d.id === id);
        items.splice(idx, 1);
      });
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['fol4'];
      delete base['doc7'];
      base['N6'].lastActivityAt = base['fol5'].lastActivityAt;
      return base;
    }
  },
  {
    description: "delete folder: also delete children (wasn't the newest)",
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('fol2');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      ['fol2', 'doc1', 'doc2', 'doc3'].forEach(id => {
        const idx = items.findIndex(d => d.id === id);
        items.splice(idx, 1);
      });
      // !! annot is not deleted yet
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['fol2'];
      delete base['doc1'];
      delete base['doc2'];
      delete base['doc3'];
      return base;
    }
  },
  {
    description: 'delete folder: also move children up',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.deleteItem('fol2', { moveItemsUp: true });
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const now = Date.now();
      const idx = items.findIndex(d => d.id === 'fol2');
      items.splice(idx, 1);
      ['doc1', 'doc2', 'doc3'].forEach(id => {
        const idx = items.findIndex(d => d.id === id);
        items[idx].parentId = 'N2';
        items[idx].parentId_meta._u = now;
      });
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['fol2'];
      base['doc1'].fullPath = ['0', 'N2', 'doc1'];
      base['doc1'].shortPath = ['N2', 'doc1'];
      base['doc2'].fullPath = ['0', 'N2', 'doc2'];
      base['doc2'].shortPath = ['N2', 'doc2'];
      base['doc3'].fullPath = ['0', 'N2', 'doc3'];
      base['doc3'].shortPath = ['N2', 'doc3'];
      return base;
    }
  }
];

export const notebookScenarios: Scenario[] = [
  {
    description: 'add a notebook',
    applyLocalData() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'N4');
      items.splice(idx, 1); // remove item
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      const { item } = notebooksService.getNewNotebookObj('N1', 'N4');
      collectionService.saveItem(item, 'N4');
    },
    bulkOperation() {
      const { items, notes } = initData();
      const idx = items.findIndex(d => d.id === 'N4');
      const N4 = oneNotebook('N4', 'N1', 'N4');
      items.splice(idx, 1, N4); // replaces item
      return { items, notes, updatedAt: N4.updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N4'].createdAt = _ts(bulk, 1);
      base['N4'].updatedAt = _ts(bulk, 1);
      base['N4'].lastActivityAt = _ts(bulk, 1);
      base['N1'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  },
  {
    description: 'update notebook (row update, title)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      notebooksService.setNotebookTitle('N3', 'new N3 title');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const now = Date.now();
      const idx = items.findIndex(d => d.id === 'N3');
      const N3 = items[idx];
      N3.title = 'new N3 title';
      N3.title_meta._u = now;
      N3.updatedAt = now;
      return { items, notes, updatedAt: now };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N3'].updatedAt = _ts(bulk, 1);
      base['N3'].lastActivityAt = _ts(bulk, 1);
      base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  },
  {
    description: 'update notebook (non row update, order)',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemField('N3', 'order', 325);
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const now = Date.now();
      const idx = items.findIndex(d => d.id === 'N3');
      const N3 = items[idx];
      N3.order = 325;
      N3.order_meta._u = now;
      return { items, notes, updatedAt };
    },
    expected: baseData
  },
  {
    description: "move notebook: wasn't the newest, is the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('N3', 'N2');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N3');
      const N3 = items[idx];
      N3.parentId = 'N2';
      N3.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N3'].fullPath = ['0', 'N2', 'N3'];
      base['doc4'].fullPath = ['0', 'N2', 'N3', 'doc4'];
      base['N2'].lastActivityAt = base['N3'].lastActivityAt;
      return base;
    }
  },
  {
    description: "move notebook: wasn't the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('N3', 'N1');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N3');
      const N3 = items[idx];
      N3.parentId = 'N1';
      N3.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N3'].fullPath = ['0', 'N1', 'N3'];
      base['doc4'].fullPath = ['0', 'N1', 'N3', 'doc4'];
      return base;
    }
  },
  {
    description: 'move notebook: was the newest, is the newest',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('N6', 'N2');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N6');
      const N6 = items[idx];
      N6.parentId = 'N2';
      N6.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N6'].fullPath = ['0', 'N2', 'N6'];
      base['fol4'].fullPath = ['0', 'N2', 'N6', 'fol4'];
      base['doc7'].fullPath = ['0', 'N2', 'N6', 'fol4', 'doc7'];
      base['fol5'].fullPath = ['0', 'N2', 'N6', 'fol5'];
      base['doc5'].fullPath = ['0', 'N2', 'N6', 'fol5', 'doc5'];
      base['doc6'].fullPath = ['0', 'N2', 'N6', 'fol5', 'doc6'];
      base['N2'].lastActivityAt = base['N6'].lastActivityAt;
      base['0'].lastActivityAt = base['N6'].lastActivityAt;
      return base;
    }
  },
  {
    description: "move notebook: was the newest, isn't the newest",
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('N1', 'N6');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N1');
      const N1 = items[idx];
      N1.parentId = 'N6';
      N1.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N1'].fullPath = ['N6', 'N1'];
      base['N4'].fullPath = ['N6', 'N1', 'N4'];
      base['0'].lastActivityAt = base['N3'].lastActivityAt;
      return base;
    }
  },
  {
    description: 'move notebook: to root',
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      collectionService.setItemParent('N1', ROOT_COLLECTION);
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N1');
      const N1 = items[idx];
      N1.parentId = ROOT_COLLECTION;
      N1.parentId_meta._u = Date.now();
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['N1'].fullPath = ['N1'];
      base['N4'].fullPath = ['N1', 'N4'];
      base['0'].lastActivityAt = base['N3'].lastActivityAt;
      return base;
    }
  },
  {
    description: 'delete notebook: was the newest',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      notebooksService.deleteNotebook('N4');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N4');
      items.splice(idx, 1);
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['N4'];
      base['N1'].lastActivityAt = base['N1'].createdAt;
      base['0'].lastActivityAt = base['N3'].lastActivityAt;
      return base;
    }
  },
  {
    description: 'delete notebook: at root',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      notebooksService.deleteNotebook('N5');
    },
    bulkOperation() {
      const { items, notes, updatedAt } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      const idx = items.findIndex(d => d.id === 'N5');
      items.splice(idx, 1);
      return { items, notes, updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['N5'];
      return base;
    }
  },
  {
    description: 'delete notebook: also delete children (was the newest)',
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      notebooksService.deleteNotebook('N1');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      ['N1', 'N4'].forEach(id => {
        const idx = items.findIndex(d => d.id === id);
        items.splice(idx, 1);
      });
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['N1'];
      delete base['N4'];
      base['0'].lastActivityAt = base['N3'].lastActivityAt;
      return base;
    }
  },
  {
    description: "delete notebook: also delete children (wasn't the newest)",
    appliesToSaveItems: false,
    applyLocalData() {
      const { items, notes } = initData();
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      notebooksService.deleteNotebook('N3');
    },
    bulkOperation() {
      const { items, notes } = initData();
      vi.advanceTimersByTime(fakeTimersDelay);
      ['N3', 'doc4'].forEach(id => {
        const idx = items.findIndex(d => d.id === id);
        items.splice(idx, 1);
      });
      return { items, notes, updatedAt: notes[1].updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk) as any;
      delete base['N3'];
      delete base['doc4'];
      return base;
    }
  }
];

export const annotsScenarios: Scenario[] = [
  {
    description: 'add a note',
    applyLocalData() {
      const { items, notes } = initData();
      const idx = notes.findIndex(d => d.id === 'annot1');
      notes.splice(idx, 1); // remove item
      collectionService.saveItems(items);
      annotsService.saveNotes(notes);
    },
    singleOperation() {
      vi.advanceTimersByTime(fakeTimersDelay);
      annotsService.addNote('doc1', undefined, 'annot1');
      annotsService.edit('annot1', getNewParsedContent('annot1 preview'));
    },
    bulkOperation() {
      const { items, notes } = initData();
      const idx = notes.findIndex(d => d.id === 'annot1');
      const annot1 = oneNote('doc1', 'annot1');
      annot1.content = getNewContent('annot1 preview');
      notes.splice(idx, 1, annot1); // replaces item
      return { items, notes, updatedAt: annot1.updatedAt };
    },
    expected(bulk) {
      const base = baseData(bulk);
      base['annot1'].createdAt = _ts(bulk, 1);
      base['annot1'].updatedAt = _ts(bulk, 1);
      base['doc1'].updatedAt = _ts(bulk, 1);
      // TODO
      // base['doc1'].lastActivityAt = _ts(bulk, 1);
      // base['N2'].lastActivityAt = _ts(bulk, 1);
      // base['0'].lastActivityAt = _ts(bulk, 1);
      return base;
    }
  }
];

export const derivedStatesScenarios: Scenario[] = [
  {
    description: 'new data in bulk from remote source',
    bulkOperation: initData,
    expected: baseData
  },
  ...documentScenarios,
  ...folderScenarios,
  ...notebookScenarios
  // ...annotsScenarios
];
