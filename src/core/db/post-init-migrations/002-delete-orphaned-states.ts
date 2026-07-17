import { Store } from 'tinybase/with-schemas';
import { SpaceArchiveTables, SpaceTables } from '../store-constants';

// TODO test that one

export default function Migration(
  _space: Store<never>,
  _spaceArchive: Store<never>
) {
  rowIdForRowId(_space, SpaceTables.ResumeState);
  rowIdForRowId(_space, SpaceTables.DerivedState);
  rowIdForDerivedRowId(_space, SpaceTables.DerivedPreview);
  rowIdForContentRowId(
    _space,
    _spaceArchive,
    SpaceTables.Collection,
    SpaceArchiveTables.CollectionContent
  );
  rowIdForContentRowId(
    _space,
    _spaceArchive,
    SpaceTables.Annotations,
    SpaceArchiveTables.AnnotationContent
  );
  rowIdForContentDerivedRowId(
    _space,
    _spaceArchive,
    SpaceArchiveTables.DerivedContent
  );
}

function rowIdForRowId(_space: Store<never>, tableId: SpaceTables) {
  let count = 0;
  const rowIds = _space.getRowIds(tableId);
  _space.transaction(() => {
    rowIds.forEach(rowId => {
      if (!_space.hasRow(SpaceTables.Collection, rowId)) {
        _space.delRow(tableId, rowId);
        count++;
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}

function rowIdForDerivedRowId(_space: Store<never>, tableId: SpaceTables) {
  let count = 0;
  const rowIds = _space.getRowIds(tableId);
  _space.transaction(() => {
    rowIds.forEach(rowId => {
      const [on, itemId] = rowId.split('-');
      if (on === 'c') {
        if (!_space.hasRow(SpaceTables.Collection, itemId)) {
          _space.delRow(tableId, rowId);
          count++;
        }
      } else if (on === 'a') {
        if (!_space.hasRow(SpaceTables.Annotations, itemId)) {
          _space.delRow(tableId, rowId);
          count++;
        }
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}

function rowIdForContentRowId(
  _space: Store<never>,
  _spaceArchive: Store<never>,
  targetId: SpaceTables,
  tableId: SpaceArchiveTables
) {
  let count = 0;
  const rowIds = _spaceArchive.getRowIds(tableId);
  _spaceArchive.transaction(() => {
    rowIds.forEach(rowId => {
      if (!_space.hasRow(targetId, rowId)) {
        _spaceArchive.delRow(tableId, rowId);
        count++;
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}

function rowIdForContentDerivedRowId(
  _space: Store<never>,
  _spaceArchive: Store<never>,
  tableId: SpaceArchiveTables
) {
  let count = 0;
  const rowIds = _spaceArchive.getRowIds(tableId);
  _spaceArchive.transaction(() => {
    rowIds.forEach(rowId => {
      const [on, itemId] = rowId.split('-');
      if (on === 'c') {
        if (!_space.hasRow(SpaceTables.Collection, itemId)) {
          _spaceArchive.delRow(tableId, rowId);
          count++;
        }
      } else if (on === 'a') {
        if (!_space.hasRow(SpaceTables.Annotations, itemId)) {
          _spaceArchive.delRow(tableId, rowId);
          count++;
        }
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}
