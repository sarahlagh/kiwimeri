import { NoSchemaStore } from './migrate';

enum _SpaceTables {
  Collection = 'collection',
  Stats = 'stats',
  ResumeState = 'collection_resume_state',
  History = 'history',
  HistoryContent = 'history_content',
  Annotations = 'document_annotation',
  DerivedContent = 'derived_content',
  DerivedPreview = 'derived_preview',
  DerivedState = 'derived_item_state'
}

enum SpaceDocContentTables {
  CollectionContent = 'collection_content',
  AnnotationContent = 'document_annotation_content'
}

const C = _SpaceTables.Collection;
const A = _SpaceTables.Annotations;
const H = _SpaceTables.History;
const S = _SpaceTables.Stats;
const RS = _SpaceTables.ResumeState;
const HC = _SpaceTables.HistoryContent;
const DC = _SpaceTables.DerivedContent;
const DP = _SpaceTables.DerivedPreview;
const CollectionContent = SpaceDocContentTables.CollectionContent;
const AnnotationContent = SpaceDocContentTables.AnnotationContent;

export default function Migration(
  _space: NoSchemaStore,
  _spaceDocContent: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  // 0.4.3
  addPreviewFieldFromPlainText(_space);
  historyContentGoesToOtherSpace(_space, _spaceArchive);
  derivedContentGoesToArchive(_space, _spaceArchive);

  // 0.4.4
  lastOpenedAtGoesToResumeState(_space);
  historyGoesToSpaceArchive(_space, _spaceArchive);
  derivedContentGoesToDocContent(_spaceArchive, _spaceDocContent);
  contentFieldsGoToOtherSpace(_space, _spaceDocContent);
}

function addPreviewFieldFromPlainText(_space: NoSchemaStore) {
  _space.getRowIds(DC).forEach(rowId => {
    if (!_space.hasCell(DC, rowId, 'plainText')) return;
    const plainText = _space.getCell(DC, rowId, 'plainText') as string;
    _space.setCell(DP, rowId, 'previewText', plainText.substring(0, 200));
  });
}

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

function derivedContentGoesToArchive(
  _space: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  _migrateTable(_space, _spaceArchive, DC, DC);
}

function lastOpenedAtGoesToResumeState(_space: NoSchemaStore) {
  _space.getRowIds(S).forEach(rowId => {
    if (_space.hasCell(S, rowId, 'lastOpenedAt')) {
      const lastOpenedAt = _space.getCell(S, rowId, 'lastOpenedAt') as number;
      const itemId = _space.getCell(S, rowId, 'itemId') as string;
      _space.setCell(RS, itemId, 'lastOpenedAt', lastOpenedAt);
      _space.delRow(S, rowId);
    }
  });
}

function historyGoesToSpaceArchive(
  _space: NoSchemaStore,
  _spaceArchive: NoSchemaStore
) {
  _migrateTable(_space, _spaceArchive, H, H);
}

function derivedContentGoesToDocContent(
  _spaceArchive: NoSchemaStore,
  _spaceDocContent: NoSchemaStore
) {
  _spaceArchive.getRowIds(DC).forEach(rowId => {
    const [on] = rowId.split('-');
    const itemId = rowId.substring(2) as string;
    const plainText = _spaceArchive.getCell(DC, rowId, 'plainText') as string;
    if (on === 'c') {
      _spaceDocContent.setCell(
        CollectionContent,
        itemId,
        'plainText',
        plainText
      );
    } else if (on === 'a') {
      _spaceDocContent.setCell(
        AnnotationContent,
        itemId,
        'plainText',
        plainText
      );
    }
  });
}

function _contentGoesToOtherSpace(
  _space: NoSchemaStore,
  _spaceDocContent: NoSchemaStore,
  oldTableId: string,
  newTableId: string
) {
  _space.getRowIds(oldTableId).forEach(rowId => {
    const content = _space.getCell(oldTableId, rowId, 'content');
    if (content) {
      _spaceDocContent.setCell(newTableId, rowId, 'content', content);
    }
    const contentMeta = _space.getCell(oldTableId, rowId, 'content_meta');
    if (contentMeta) {
      _spaceDocContent.setCell(newTableId, rowId, 'content_meta', contentMeta);
    }
  });
}

function contentFieldsGoToOtherSpace(
  _space: NoSchemaStore,
  _spaceDocContent: NoSchemaStore
) {
  _contentGoesToOtherSpace(_space, _spaceDocContent, C, CollectionContent);
  _contentGoesToOtherSpace(_space, _spaceDocContent, A, AnnotationContent);
}
