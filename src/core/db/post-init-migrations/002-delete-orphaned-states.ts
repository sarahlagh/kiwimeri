import { Store } from 'tinybase/with-schemas';
import { SpaceContentTables, SpaceTables } from '../store-constants';

// TODO test that one

export default function Migration(
  _space: Store<never>,
  _spaceContent: Store<never>
) {
  rowIdForRowId(_space, SpaceTables.ResumeState);
  rowIdForRowId(_space, SpaceTables.DerivedState);
  rowIdForDerivedRowId(_space, SpaceTables.DerivedPreview);
  rowIdForContentRowId(
    _space,
    _spaceContent,
    SpaceTables.Collection,
    SpaceContentTables.CollectionContent
  );
  rowIdForContentRowId(
    _space,
    _spaceContent,
    SpaceTables.Annotations,
    SpaceContentTables.AnnotationContent
  );
  rowIdForContentDerivedRowId(
    _space,
    _spaceContent,
    SpaceContentTables.DerivedContent
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
  _spaceContent: Store<never>,
  targetId: SpaceTables,
  tableId: SpaceContentTables
) {
  let count = 0;
  const rowIds = _spaceContent.getRowIds(tableId);
  _spaceContent.transaction(() => {
    rowIds.forEach(rowId => {
      if (!_space.hasRow(targetId, rowId)) {
        _spaceContent.delRow(tableId, rowId);
        count++;
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}

function rowIdForContentDerivedRowId(
  _space: Store<never>,
  _spaceContent: Store<never>,
  tableId: SpaceContentTables
) {
  let count = 0;
  const rowIds = _spaceContent.getRowIds(tableId);
  _spaceContent.transaction(() => {
    rowIds.forEach(rowId => {
      const [on, itemId] = rowId.split('-');
      if (on === 'c') {
        if (!_space.hasRow(SpaceTables.Collection, itemId)) {
          _spaceContent.delRow(tableId, rowId);
          count++;
        }
      } else if (on === 'a') {
        if (!_space.hasRow(SpaceTables.Annotations, itemId)) {
          _spaceContent.delRow(tableId, rowId);
          count++;
        }
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}
