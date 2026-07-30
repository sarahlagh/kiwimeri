import { Store } from 'tinybase/with-schemas';
import { SpaceDocContentTables, SpaceTables } from '../store-constants';

export default function Migration(
  _space: Store<never>,
  _spaceDocContent: Store<never>
) {
  rowIdForRowId(_space, SpaceTables.ResumeState);
  rowIdForRowId(_space, SpaceTables.DerivedState);
  rowIdForDerivedRowId(_space, SpaceTables.DerivedPreview);
  rowIdForContentRowId(
    _space,
    _spaceDocContent,
    SpaceTables.Collection,
    SpaceDocContentTables.CollectionContent
  );
  rowIdForContentRowId(
    _space,
    _spaceDocContent,
    SpaceTables.Annotations,
    SpaceDocContentTables.AnnotationContent
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
      const [on] = rowId.split('-');
      const itemId = rowId.substring(2);
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
  _spaceText: Store<never>,
  targetId: SpaceTables,
  tableId: SpaceDocContentTables
) {
  let count = 0;
  const rowIds = _spaceText.getRowIds(tableId);
  _spaceText.transaction(() => {
    rowIds.forEach(rowId => {
      if (!_space.hasRow(targetId, rowId)) {
        _spaceText.delRow(tableId, rowId);
        count++;
      }
    });
  });
  if (count > 0) console.log('table', tableId, `had ${count} to delete`);
}
