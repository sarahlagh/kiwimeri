import { unminimizeContentFromStorage } from './002-compress-file-content';
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
  DerivedState = 'derived_item_state',
  ProjectedState = 'collection_projected_state',
  CollectionItemView = 'collection_item_view',
  AnnotationView = 'document_annotation_view'
}

enum _SpaceDocContentTables {
  CollectionContent = 'collection_content',
  AnnotationContent = 'document_annotation_content'
}

const C = _SpaceTables.Collection;
const A = _SpaceTables.Annotations;
const H = _SpaceTables.History;
const S = _SpaceTables.Stats;
const RS = _SpaceTables.ResumeState;
const HC = _SpaceTables.HistoryContent;
const CC = _SpaceDocContentTables.CollectionContent;
const AC = _SpaceDocContentTables.AnnotationContent;
const ProjectedState = _SpaceTables.ProjectedState;
const CV = _SpaceTables.CollectionItemView;
const AV = _SpaceTables.AnnotationView;
// previous tables
const DerivedContent = _SpaceTables.DerivedContent;
const DerivedPreview = _SpaceTables.DerivedPreview;
const DerivedState = _SpaceTables.DerivedState;

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

  // 0.4.5
  contentFieldsGoToOtherSpace(_space, _spaceDocContent);
  derivedStateBecomesProjectedState(_space);
  splitDerivedPreviewInTwoViews(_space);
  lastOpenedAtGoesToView(_space);

  // 0.4.6
  stopMinimizingContent(_spaceDocContent);
}

function addPreviewFieldFromPlainText(_space: NoSchemaStore) {
  _space.getRowIds(DerivedContent).forEach(rowId => {
    if (!_space.hasCell(DerivedContent, rowId, 'plainText')) return;
    const plainText = _space.getCell(
      DerivedContent,
      rowId,
      'plainText'
    ) as string;
    _space.setCell(
      DerivedPreview,
      rowId,
      'previewText',
      plainText.substring(0, 200)
    );
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
  _migrateTable(_space, _spaceArchive, DerivedContent, DerivedContent);
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
  _spaceArchive.getRowIds(DerivedContent).forEach(rowId => {
    const [on] = rowId.split('-');
    const itemId = rowId.substring(2) as string;
    const plainText = _spaceArchive.getCell(
      DerivedContent,
      rowId,
      'plainText'
    ) as string;
    if (on === 'c') {
      _spaceDocContent.setCell(CC, itemId, 'plainText', plainText);
    } else if (on === 'a') {
      _spaceDocContent.setCell(AC, itemId, 'plainText', plainText);
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
  _contentGoesToOtherSpace(_space, _spaceDocContent, C, CC);
  _contentGoesToOtherSpace(_space, _spaceDocContent, A, AC);
}

function renameTable(
  _space: NoSchemaStore,
  oldTable: string,
  newTable: string
) {
  if (!_space.hasTable(oldTable)) {
    return;
  }
  _space.getRowIds(oldTable).forEach(rowId => {
    const row = _space.getRow(oldTable, rowId);
    _space.setRow(newTable, rowId, row);
  });
}

function derivedStateBecomesProjectedState(_space: NoSchemaStore) {
  renameTable(_space, DerivedState, ProjectedState);
}

function splitDerivedPreviewInTwoViews(_space: NoSchemaStore) {
  if (!_space.hasTable(DerivedPreview)) {
    return;
  }
  _space.getRowIds(DerivedPreview).forEach(rowId => {
    const row = _space.getRow(DerivedPreview, rowId);
    const [on] = rowId.split('-');
    const itemId = rowId.substring(2);
    if (on === 'c') {
      _space.setRow(CV, itemId, row);
    } else if (on === 'a') {
      _space.setRow(AV, itemId, row);
    }
  });
  // rank goes to view too
  _space.getRowIds(ProjectedState).forEach(rowId => {
    const row = _space.getRow(ProjectedState, rowId);
    const updatedAtRank = row.updatedAtRank;
    const lastOpenedAtRank = row.lastOpenedAtRank;
    if (updatedAtRank !== undefined) {
      _space.setCell(CV, rowId, 'updatedAtRank', updatedAtRank);
    }
    if (lastOpenedAtRank !== undefined) {
      _space.setCell(CV, rowId, 'lastOpenedAtRank', lastOpenedAtRank);
    }
  });
}

function lastOpenedAtGoesToView(_space: NoSchemaStore) {
  _space.getRowIds(RS).forEach(rowId => {
    const lastOpenedAt = _space.getCell(RS, rowId, 'lastOpenedAt');
    if (lastOpenedAt !== undefined) {
      _space.setCell(CV, rowId, 'lastOpenedAt', lastOpenedAt);
    }
  });
}

const INITIAL_CONTENT_START = '{"root":{';
function _stopMinimizingContent(
  _spaceDocContent: NoSchemaStore,
  tableId: string
) {
  _spaceDocContent.getRowIds(tableId).forEach(rowId => {
    const content = _spaceDocContent.getCell(
      tableId,
      rowId,
      'content'
    ) as string;
    if (content.startsWith(INITIAL_CONTENT_START)) return;
    const full = unminimizeContentFromStorage(content);
    _spaceDocContent.setCell(tableId, rowId, 'content', full);
  });
}
function stopMinimizingContent(_spaceDocContent: NoSchemaStore) {
  _stopMinimizingContent(_spaceDocContent, CC);
  _stopMinimizingContent(_spaceDocContent, AC);
}
