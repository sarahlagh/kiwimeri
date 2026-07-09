import { NoSchemaStore } from './migrate';

enum _SpaceTables {
  Collection = 'collection',
  HistoryContent = 'history_content',
  Annotations = 'document_annotation',
  DerivedContent = 'derived_content',
  DerivedPreview = 'derived_preview',
  DerivedState = 'derived_item_state'
}

// enum _SpaceContentTables {
//   CollectionContent = 'collection_content',
//   AnnotationContent = 'document_annotation_content'
// }

// const C = _SpaceTables.Collection;
// const A = _SpaceTables.Annotations;
const HC = _SpaceTables.HistoryContent;
const DC = _SpaceTables.DerivedContent;
const DP = _SpaceTables.DerivedPreview;
// const CC = _SpaceContentTables.CollectionContent;
// const AC = _SpaceContentTables.AnnotationContent;

// TODO preview for annotations? go where?

export default function Migration(
  _space: NoSchemaStore,
  _spaceContent: NoSchemaStore
) {
  addPreviewFieldFromPlainText(_space);
  // contentFieldsGoToOtherSpace(_space, _spaceContent);
  historyContentGoesToOtherSpace(_space, _spaceContent);
  derivedContentGoesToOtherSpace(_space, _spaceContent);
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
//   _spaceContent: NoSchemaStore,
//   oldTableId: string,
//   newTableId: string
// ) {
//   _space.getRowIds(oldTableId).forEach(rowId => {
//     const content = _space.getCell(oldTableId, rowId, 'content');
//     const content_meta = _space.getCell(oldTableId, rowId, 'content_meta');
//     _spaceContent.setRow(newTableId, rowId, {
//       content,
//       content_meta
//     });
//   });
// }

// function contentFieldsGoToOtherSpace(
//   _space: NoSchemaStore,
//   _spaceContent: NoSchemaStore
// ) {
//   _contentGoesToOtherSpace(_space, _spaceContent, C, CC);
//   _contentGoesToOtherSpace(_space, _spaceContent, A, AC);
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
  _spaceContent: NoSchemaStore
) {
  _migrateTable(_space, _spaceContent, HC, HC);
}

function derivedContentGoesToOtherSpace(
  _space: NoSchemaStore,
  _spaceContent: NoSchemaStore
) {
  _migrateTable(_space, _spaceContent, DC, DC);
}
