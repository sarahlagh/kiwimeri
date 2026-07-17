import { NoSchemaStore } from './migrate';

enum _SpaceTables {
  Collection = 'collection',
  HistoryContent = 'history_content',
  Annotations = 'document_annotation',
  DerivedContent = 'derived_content',
  DerivedPreview = 'derived_preview',
  DerivedState = 'derived_item_state'
}

// enum _SpaceArchiveTables {
//   CollectionContent = 'collection_content',
//   AnnotationContent = 'document_annotation_content'
// }

// const C = _SpaceTables.Collection;
// const A = _SpaceTables.Annotations;
const HC = _SpaceTables.HistoryContent;
const DC = _SpaceTables.DerivedContent;
const DP = _SpaceTables.DerivedPreview;
// const CC = _SpaceArchiveTables.CollectionContent;
// const AC = _SpaceArchiveTables.AnnotationContent;

// TODO preview for annotations? go where?

export default function Migration(
  _space: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  addPreviewFieldFromPlainText(_space);
  // contentFieldsGoToOtherSpace(_space, _spaceArchive);
  historyContentGoesToOtherSpace(_space, _spaceArchive);
  derivedContentGoesToOtherSpace(_space, _spaceArchive);
}

function addPreviewFieldFromPlainText(_space: NoSchemaStore) {
  _space.getRowIds(DC).forEach(rowId => {
    if (!_space.hasCell(DC, rowId, 'plainText')) return;
    const plainText = _space.getCell(DC, rowId, 'plainText') as string;
    _space.setCell(DP, rowId, 'previewText', plainText.substring(0, 200));
  });
}

// function _contentGoesToOtherSpace(
//   _space: NoSchemaStore,
//   _spaceArchive: NoSchemaStore,
//   oldTableId: string,
//   newTableId: string
// ) {
//   _space.getRowIds(oldTableId).forEach(rowId => {
//     const content = _space.getCell(oldTableId, rowId, 'content');
//     const content_meta = _space.getCell(oldTableId, rowId, 'content_meta');
//     _spaceArchive.setRow(newTableId, rowId, {
//       content,
//       content_meta
//     });
//   });
// }

// function contentFieldsGoToOtherSpace(
//   _space: NoSchemaStore,
//   _spaceArchive: NoSchemaStore
// ) {
//   _contentGoesToOtherSpace(_space, _spaceArchive, C, CC);
//   _contentGoesToOtherSpace(_space, _spaceArchive, A, AC);
// }

function _migrateTable(
  _oldStore: NoSchemaStore,
  _newStore: NoSchemaStore,
  oldTable: string,
  newTable: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform?: (row: any, rowId: string) => any
) {
  if (!_oldStore.hasTable(oldTable)) {
    return;
  }
  _oldStore.getRowIds(oldTable).forEach(rowId => {
    let row = _oldStore.getRow(oldTable, rowId);
    if (transform) row = transform(row, rowId);
    _newStore.setRow(newTable, rowId, row);
  });
}

function historyContentGoesToOtherSpace(
  _space: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  _migrateTable(_space, _spaceArchive, HC, HC);
}

function derivedContentGoesToOtherSpace(
  _space: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  _migrateTable(_space, _spaceArchive, DC, DC);
}
