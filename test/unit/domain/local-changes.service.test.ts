import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { SerializableData } from '@/core/db/types';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import {
  startDerivedTablesListeners,
  stopDerivedTablesListeners
} from '@/domain/collection/derived-tables-listeners';
import notebooksService from '@/domain/collection/notebooks.service';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/synchronization/local-changes';
import localChangesService from '@/domain/synchronization/local-changes.service';
import {
  fakeTimersDelay,
  GET_UPDATABLE_FIELDS,
  getLocalItemField,
  getNewContent,
  getNewParsedContent,
  getNewValue,
  markAsConflict,
  UPDATABLE_FIELDS,
  ValueType
} from '@@/_setup/test.utils';
import { Id } from 'tinybase/with-schemas';
import { describe, expect, it } from 'vitest';

const getNonNotebookLocalChanges = (localChanges: LocalChangeResult[]) =>
  localChanges.filter(
    lc => lc.itemId !== notebooksService.getCurrentNotebook()
  );

describe('local changes service', () => {
  it('should only have notebook local changes by default', () => {
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const lc = localChangesService.getLocalChanges()[0];
    expect(lc.change).toBe(LocalChangeType.add);
    expect(getLocalItemField(lc.itemId, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should create a local change for each created items', () => {
    const createdItems: string[] = [];
    createdItems.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    createdItems.push(collectionService.addFolder(DEFAULT_NOTEBOOK_ID));
    createdItems.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(4);
    expect(getNonNotebookLocalChanges(localChanges).map(l => l.itemId)).toEqual(
      createdItems.toReversed()
    );
  });

  it('should merge local changes for each created then updated items into one change', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(2);
    const lc = getNonNotebookLocalChanges(localChanges)[0];
    expect(lc.itemId).toEqual(id);
    expect(lc.change).toEqual('a');
    expect(lc.field).toBeUndefined();
  });

  it('should merge local changes for each updated items into one change per field', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemTitle(id, 'new title 3');
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    const localChanges = localChangesService.getLocalChanges();

    expect(localChanges).toHaveLength(2);
    expect(localChanges.map(l => l.itemId)).toEqual([id, id]);
    expect(localChanges.map(l => l.change)).toEqual(['u', 'u']);
    expect(localChanges.map(l => l.field)).toEqual(['content', 'title']);
  });

  it('should keep no local changes for each created then deleted items', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    collectionService.deleteItem(id);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(getLocalItemField(localChanges[0].itemId, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should merge local changes for each deleted items into one change', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemLexicalContent(id, getNewParsedContent('test'));
    collectionService.deleteItem(id);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe(LocalChangeType.delete);
  });

  it(`should consider previous conflicts as added`, () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const id2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    markAsConflict(id, id2);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe('a');
  });

  it(`should not add local changes if the value doesn't change`, () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    GET_UPDATABLE_FIELDS('document').forEach(({ field }) => {
      const current = collectionService.getItemField<SerializableData>(
        id,
        field
      );
      collectionService.setItemField(id, field, current!);
    });

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(0);
  });

  it(`should create local change after saveItem for a new item`, () => {
    localChangesService.clear();
    const { item } = collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);
    const id = collectionService.saveItem(item);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe(LocalChangeType.add);
    expect(localChanges[0].itemId).toBe(id);
  });

  it(`should create local change after saveItem for an updated item`, () => {
    localChangesService.clear();
    const { item } = collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);
    const id = collectionService.saveItem(item);
    localChangesService.clear();
    item.content = getNewContent('new stuff');

    collectionService.saveItem(item, id);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe(LocalChangeType.update);
    expect(localChanges[0].field).toBe('content');
    expect(localChanges[0].itemId).toBe(id);
  });

  it(`should create local change after saveItems`, () => {
    vi.useFakeTimers();
    localChangesService.clear();
    const { item: item1 } =
      collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);
    const id1 = collectionService.saveItem(item1);
    const { item: item2 } =
      collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);
    const id2 = collectionService.saveItem(item2);
    localChangesService.clear();

    const { item: item3, id: id3 } =
      collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);

    item1.content = getNewContent('new stuff');
    item2.title = 'new title';

    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.saveItems([
      { ...item1, id: id1 },
      { ...item2, id: id2 },
      { ...item3, id: id3 }
    ]);

    // add change is older than update changes
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(3);
    expect(
      localChanges.map(lc => `${lc.itemId}-${lc.change}-${lc.field || ''}`)
    ).toEqual([`${id2}-u-title`, `${id1}-u-content`, `${id3}-a-`]);
    vi.useRealTimers();
  });
});

describe('local changes listeners', () => {
  beforeEach(() => {
    localChangesService.clear();
    stopDerivedTablesListeners();
    vi.useFakeTimers();
  });
  afterEach(() => {
    startDerivedTablesListeners();
    vi.useRealTimers();
  });
  const watchedTables: {
    tableId: Id;
    watchedFields: { field: Id; valueType: ValueType }[];
    nonWatchedFields: { field: Id; valueType: ValueType }[];
  }[] = [
    {
      tableId: SpaceTables.Collection,
      watchedFields: UPDATABLE_FIELDS,
      nonWatchedFields: [
        { field: 'updatedAt', valueType: 'number' },
        { field: 'itemId', valueType: 'id' }
      ]
    },
    {
      tableId: SpaceTables.Annotations,
      watchedFields: [
        { field: 'content', valueType: 'lex' },
        { field: 'order', valueType: 'number' }
      ],
      nonWatchedFields: [
        { field: 'updatedAt', valueType: 'number' },
        { field: 'preview', valueType: 'string' }
      ]
    }
  ];
  function getField(testField: { field: string; valueType: ValueType }) {
    return testField.field as never;
  }
  function getValue(testField: { field: string; valueType: ValueType }) {
    return getNewValue(testField.valueType) as never;
  }

  watchedTables.forEach(
    ({ tableId: _tableId, watchedFields, nonWatchedFields }) => {
      describe(`watches table ${_tableId}`, () => {
        const tableId = _tableId as never;
        const fakeRow = {};
        fakeRow[getField(nonWatchedFields[0])] = getValue(nonWatchedFields[0]);
        fakeRow[getField(watchedFields[0])] = getValue(watchedFields[0]);

        it(`should create a local change for new rows`, () => {
          const testId0 = space.addRow(tableId, fakeRow);
          space.setRow(tableId, 'testId1', fakeRow);
          space.setPartialRow(tableId, 'testId2', fakeRow);
          space.setCell(
            tableId,
            'testId3',
            getField(nonWatchedFields[0]),
            getValue(nonWatchedFields[0])
          );

          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(4);
          expect(
            localChanges.map(lc => `${lc.on}-${lc.itemId}-${lc.change}`)
          ).toEqual([
            `${tableId}-testId3-a`,
            `${tableId}-testId2-a`,
            `${tableId}-testId1-a`,
            `${tableId}-${testId0}-a`
          ]);
        });

        it(`should create a local change for new rows in bulk`, () => {
          const testId0 = space.addRow(tableId, fakeRow);
          space.transaction(() => {
            space.setRow(tableId, 'testId1', fakeRow);
            vi.advanceTimersByTime(10);
            space.setPartialRow(tableId, 'testId2', fakeRow);
            vi.advanceTimersByTime(10);
            space.setCell(
              tableId,
              'testId3',
              getField(nonWatchedFields[0]),
              getValue(nonWatchedFields[0])
            );
            vi.advanceTimersByTime(10);
          });

          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(4);
          expect(
            localChanges.map(lc => `${lc.on}-${lc.itemId}-${lc.change}`)
          ).toEqual([
            `${tableId}-testId3-a`,
            `${tableId}-testId2-a`,
            `${tableId}-testId1-a`,
            `${tableId}-${testId0}-a`
          ]);
        });

        it(`should create local changes for deleted rows`, () => {
          space.delTable(tableId);
          const rowId1 = space.addRow(tableId, fakeRow)!;
          const rowId2 = space.addRow(tableId, fakeRow)!;
          const rowId3 = space.addRow(tableId, fakeRow)!;
          localChangesService.clear();

          space.delCell(tableId, rowId1, getField(nonWatchedFields[0]));
          expect(localChangesService.getLocalChanges()).toHaveLength(0);

          space.delRow(tableId, rowId2);
          expect(localChangesService.getLocalChanges()).toHaveLength(1);

          space.delTable(tableId);
          const localChanges = localChangesService.getLocalChanges();

          expect(localChanges).toHaveLength(3);
          expect(
            localChanges.map(lc => `${lc.on}-${lc.itemId}-${lc.change}`)
          ).toEqual([
            `${tableId}-${rowId3}-d`,
            `${tableId}-${rowId1}-d`,
            `${tableId}-${rowId2}-d`
          ]);
        });

        it(`should cancel local change if added then deleted in same session`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          expect(localChangesService.getLocalChanges()).toHaveLength(1);
          space.delRow(tableId, testId);
          expect(localChangesService.getLocalChanges()).toHaveLength(0);
        });

        it(`should cancel local change if added then deleted in same transaction`, () => {
          space.transaction(() => {
            const testId = space.addRow(tableId, fakeRow)!;
            space.delRow(tableId, testId);
          });
          expect(localChangesService.getLocalChanges()).toHaveLength(0);
        });

        it(`should only keep a single add change if updated in same session`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          expect(localChangesService.getLocalChanges()).toHaveLength(1);
          watchedFields.forEach(wf => {
            space.setCell(tableId, testId, getField(wf), getValue(wf));
          });
          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(1);
          expect(localChanges[0].change).toEqual(LocalChangeType.add);
          expect(localChanges[0].itemId).toBe(testId);
        });

        it(`should cancel local change if updated then deleted in same session`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          localChangesService.clear(); // new session

          watchedFields.forEach(wf => {
            space.setCell(tableId, testId, getField(wf), getValue(wf));
          });
          expect(localChangesService.getLocalChanges()).toHaveLength(
            watchedFields.length
          );

          space.delRow(tableId, testId);
          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(1);
          expect(localChanges[0].change).toEqual(LocalChangeType.delete);
          expect(localChanges[0].itemId).toBe(testId);
        });

        it(`should create an add change if item was a conflict`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          localChangesService.clear();
          space.setCell(tableId, testId, 'conflictId', 'anyvalue' as never); // create conflict
          expect(localChangesService.getLocalChanges()).toHaveLength(0);

          // resolve conflict
          space.transaction(() => {
            space.setCell(
              tableId,
              testId,
              getField(watchedFields[0]),
              getValue(watchedFields[0])
            );
            space.delCell(tableId, testId, 'conflictId');
          });

          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(1);
          expect(localChanges[0].change).toEqual(LocalChangeType.add);
          expect(localChanges[0].itemId).toBe(testId);
        });

        it(`should keep only one local changes per field update`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          localChangesService.clear();

          for (let i = 0; i < 3; i++) {
            space.setCell(
              tableId,
              testId,
              getField(watchedFields[0]),
              getValue(watchedFields[0])
            );
          }

          space.setCell(
            tableId,
            testId,
            getField(watchedFields[1]),
            getValue(watchedFields[1])
          );

          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(2);
          expect(localChanges[0].change).toEqual(LocalChangeType.update);
          expect(localChanges[0].field).toEqual(getField(watchedFields[1]));
          expect(localChanges[0].itemId).toBe(testId);
          expect(localChanges[1].change).toEqual(LocalChangeType.update);
          expect(localChanges[1].field).toEqual(getField(watchedFields[0]));
          expect(localChanges[1].itemId).toBe(testId);
        });

        it(`should cancel local change if deleted then restored in same session`, () => {
          const testId = space.addRow(tableId, fakeRow)!;
          localChangesService.clear();
          space.delRow(tableId, testId);
          expect(localChangesService.getLocalChanges()).toHaveLength(1);
          space.setRow(tableId, testId, fakeRow);
          const localChanges = localChangesService.getLocalChanges();
          expect(localChanges).toHaveLength(1);
          expect(localChanges[0].change).toBe(LocalChangeType.update);
          expect(localChanges[0].itemId).toBe(testId);
        });

        watchedFields.forEach(field => {
          it(`should create update local changes for field ${field.field}`, () => {
            const testId = space.addRow(tableId, fakeRow)!;
            localChangesService.clear();

            space.setCell(tableId, testId, getField(field), getValue(field));
            const localChanges = localChangesService.getLocalChanges();
            expect(localChanges).toHaveLength(1);
            expect(localChanges[0].change).toEqual(LocalChangeType.update);
            expect(localChanges[0].field).toEqual(getField(field));
            expect(localChanges[0].itemId).toBe(testId);
          });

          it(`should create only one update local changes for field ${field.field}`, () => {
            const testId = space.addRow(tableId, fakeRow)!;
            localChangesService.clear();

            space.setCell(tableId, testId, getField(field), getValue(field));
            space.setCell(tableId, testId, getField(field), getValue(field));
            space.setCell(tableId, testId, getField(field), getValue(field));
            const localChanges = localChangesService.getLocalChanges();
            expect(localChanges).toHaveLength(1);
            expect(localChanges[0].change).toEqual(LocalChangeType.update);
            expect(localChanges[0].field).toEqual(getField(field));
            expect(localChanges[0].itemId).toBe(testId);
          });
        });

        nonWatchedFields.forEach(field => {
          it(`should not create update local changes for field ${field.field}`, () => {
            const testId = space.addRow(tableId, fakeRow)!;
            localChangesService.clear();

            space.setCell(tableId, testId, getField(field), getValue(field));
            const localChanges = localChangesService.getLocalChanges();
            expect(localChanges).toHaveLength(0);
          });
        });
      });
    }
  );
});
