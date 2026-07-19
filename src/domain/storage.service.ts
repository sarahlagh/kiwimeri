import { ANNOT_PREVIEW_SIZE, DOC_PREVIEW_SIZE } from '@/constants';
import { space, spaceArchive, spaceDocContent } from '@/core/db/store';
import {
  SpaceArchiveTables,
  SpaceDocContentTables,
  SpaceTables
} from '@/core/db/store-constants';
import {
  SpaceTableId,
  SpaceTablesType,
  SpaceType
} from '@/core/db/store-schema';
import notebooksService from '@/domain/collection/notebooks.service';
import localChangesService from '@/domain/synchronization/local-changes.service';
import { getPlainText } from '@/shared/misc/getPlainText';
import { cellEquals } from '@/shared/utils';
import { Content, Table } from 'tinybase/with-schemas';
import {
  CollectionItemType,
  CollectionItemUpdatableFields,
  isDocument
} from './collection/collection';
import collectionService from './collection/collection.service';
import { getDerivedId } from './collection/document-content';
import { resumeService } from './collection/resume-state.service';
import tagsService from './collection/tags.service';
import { historyService } from './history/history.service';
import { statsOnPlainTextCallback } from './stats/stats-on-change-callback';
import {
  LocalChangeResult,
  LocalChangeType
} from './synchronization/local-changes';
import { AfterSyncChange } from './synchronization/merging/types';

const C = SpaceTables.Collection;
const A = SpaceTables.Annotations;
const H = SpaceArchiveTables.History;
const HC = SpaceArchiveTables.HistoryContent;
const S = SpaceTables.Stats;
const CollectionContent = SpaceDocContentTables.CollectionContent;
const DerivedPreview = SpaceTables.DerivedPreview;
const DerivedState = SpaceTables.DerivedState;
const AnnotationContent = SpaceDocContentTables.AnnotationContent;
const ResumeState = SpaceTables.ResumeState;

class StorageService {
  public nukeSpace() {
    space.setContent([{}, {}]);
    spaceDocContent.setContent([{}, {}]);
    spaceArchive.setContent([{}, {}]);
    notebooksService.initNotebooks();
    localChangesService.clear();
    tagsService.clear();
  }

  public backfillDerivedContent() {
    const collection = space.getTable(C);
    const annotations = space.getTable(A);
    spaceArchive.startTransaction();
    space.transaction(() => {
      space.getRowIds(C).forEach(rowId => {
        if (!collection[rowId].content) return;
        const plainText = getPlainText(collection[rowId].content);
        const previewText = plainText.substring(0, DOC_PREVIEW_SIZE);
        const derivedId = getDerivedId('c', rowId);
        space.setRow(SpaceTables.DerivedPreview, derivedId, {
          previewText
        });
        spaceDocContent.setCell(
          SpaceDocContentTables.CollectionContent,
          rowId,
          'plainText',
          plainText
        );
        statsOnPlainTextCallback(rowId, plainText);
      });
      space.getRowIds(SpaceTables.Annotations).forEach(rowId => {
        if (!annotations[rowId].content) return;
        const plainText = getPlainText(annotations[rowId].content);
        const previewText = plainText.substring(0, ANNOT_PREVIEW_SIZE);
        const derivedId = getDerivedId('a', rowId);
        space.setRow(SpaceTables.DerivedPreview, derivedId, {
          previewText
        });
        spaceDocContent.setCell(
          SpaceDocContentTables.AnnotationContent,
          rowId,
          'plainText',
          plainText
        );
      });
    });
    spaceArchive.finishTransaction();
  }

  public cleanupRow(rowId: string, on: SpaceTableId) {
    let derivedId;
    if (on === SpaceTables.Collection) {
      derivedId = getDerivedId('c', rowId);
      space.delRow(DerivedState, rowId);
      space.delRow(ResumeState, rowId);
      spaceDocContent.delRow(CollectionContent, rowId);
    }
    if (on === SpaceTables.Annotations) {
      derivedId = getDerivedId('a', rowId);
      spaceDocContent.delRow(AnnotationContent, rowId);
    }
    if (derivedId) {
      space.delRow(DerivedPreview, derivedId);
    }
  }

  public exportJson(withHistory: boolean) {
    const content = space.getContent();
    if (!withHistory) {
      return JSON.stringify([
        {
          collection: content[0].collection,
          document_annotation: content[0].document_annotation
        }
      ]);
    }
    const archive_content = spaceArchive.getContent();
    return JSON.stringify([
      {
        collection: content[0].collection,
        document_annotation: content[0].document_annotation,
        history: archive_content[0].history,
        history_content: archive_content[0].history_content,
        stats: content[0].stats
      }
    ]);
  }

  /// from restore button
  public restoreJson(content: string) {
    const localContent = space.getContent();
    const json = JSON.parse(content);
    const [tables] = json;

    localChangesService.clear();

    space.transaction(() => {
      this.setContent(tables, false);
      if (tables[H]) {
        spaceArchive.setTable(H, tables[H]);
      }
      if (tables[HC]) {
        spaceArchive.setTable(HC, tables[HC]);
      }
    });
    if (tables[S]) {
      space.setTable(S, tables[S]);
    }

    const changes = this.afterSyncHistChanges(json, localContent, [], true);
    space.delTable(SpaceTables.ResumeState);
    this.handleHistory(changes);
    this.handleDeletedRows(changes);
  }

  /// from synchronizer
  public restoreContent(
    content: Content<SpaceType, false>,
    changes: AfterSyncChange[]
  ) {
    this.setContent(content[0], true);
    this.handleResumeState(changes);
    this.handleHistory(changes);
    this.handleDeletedRows(changes);
  }

  public afterSyncHistChanges(
    newLocalContent: Content<SpaceType>,
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    force?: boolean
  ) {
    // TODO wait. same for annotations!!!!!!
    let changes: AfterSyncChange[] = [];
    changes = [
      ...changes,
      ...this.diffTable(C, newLocalContent, localContent, localChanges, force)
    ];
    return changes;
  }

  private diffTable(
    tableId: SpaceTableId,
    newLocalContent: Content<SpaceType>,
    localContent: Content<SpaceType>,
    localChanges: LocalChangeResult[],
    force?: boolean
  ) {
    // TODO wait. same for annotations!!!!!!
    const changes: Map<string, AfterSyncChange> = new Map();
    const ids = new Set<string>([
      ...Object.keys(newLocalContent[0][tableId]!),
      ...Object.keys(localContent[0][tableId]!)
    ]);
    ids.forEach(id => {
      // TODO how do we handle local changes when force full?
      const localChange = localChanges.find(
        lc => lc.itemId === id && lc.on === tableId
      );
      const newItem = newLocalContent[0].collection![id];
      const oldItem = localContent[0].collection![id];
      if (newItem && !newItem.conflictId && !oldItem) {
        const type = newItem.type as CollectionItemType;
        // added by remote
        changes.set(id, {
          id,
          type,
          on: tableId,
          parentId: newItem.parentId as string,
          change: LocalChangeType.add
        });
      } else if (
        !newItem &&
        oldItem &&
        (force || localChange?.change !== LocalChangeType.add)
      ) {
        // deleted by remote
        changes.set(id, {
          id,
          on: tableId,
          type: oldItem.type as CollectionItemType,
          parentId: oldItem.parentId as string,
          change: LocalChangeType.delete
        });
      } else if (newItem && oldItem) {
        const type = newItem.type as CollectionItemType;
        const historizableFields = [...CollectionItemUpdatableFields].filter(
          field => localChange?.field !== field
        );

        // no local change, remote change on hist field                 => new version
        // no local change, remote change on non hist field             => no new version
        // local change, no remote change                               => no new version
        // local change, remote change on hist field, local wins        => no new version
        // local change, remote change on hist field, remote wins       => new version
        // local change, remote change on non hist field, local wins    => no new version
        // local change, remote change on non hist field, remote wins   => no new version
        for (const field of historizableFields) {
          // only create change for the first field
          // if local wins, mustn't have new version - won't happen if no local change
          if (!cellEquals(oldItem[field], newItem[field])) {
            changes.set(id, {
              id,
              type,
              on: tableId,
              parentId: newItem.parentId as string,
              change: LocalChangeType.update,
              field
            });
            break;
          }
        }
      }
    });
    return [...changes.values()];
  }

  private setContent(
    content: Content<SpaceType, false>[0],
    withUserPrefs: boolean
  ) {
    space.transaction(() => {
      this.setTable(SpaceTables.Collection, content[SpaceTables.Collection]);
      collectionService.backfillDerivedStates(content[SpaceTables.Collection]);
      this.setTable(SpaceTables.Annotations, content[SpaceTables.Annotations]);
      if (withUserPrefs) {
        this.setTable(
          SpaceTables.UserPreference,
          content[SpaceTables.UserPreference]
        );
      }
    });
  }

  private setTable(
    tableName: SpaceTableId,
    table?: Table<SpaceTablesType, SpaceTableId, true>
  ) {
    if (table && Object.keys(table).length === 0) {
      space.delTable(tableName);
    }
    if (table) {
      space.setTable(tableName, table);
    }
  }

  private handleResumeState(changes: AfterSyncChange[]) {
    // reset resume state if content has changed
    changes
      .filter(ch => isDocument(ch.type) && ch.field === 'content')
      .forEach(ch => resumeService.setLastSelection(ch.id, null));
  }

  private handleHistory(changes: AfterSyncChange[]) {
    // history must be updated
    const docsMap = new Map<string, AfterSyncChange>();
    changes
      .filter(ch => isDocument({ type: ch.type }))
      .filter(
        ch =>
          !ch.field ||
          collectionService.isHistorizableContentChange(ch.type, ch.field)
      )
      .forEach(ch => docsMap.set(ch.id, ch));

    [...docsMap.values()].forEach(ch => {
      historyService.updateAfterSync(ch);
    });
    historyService.gc();
  }

  private handleDeletedRows(changes: AfterSyncChange[]) {
    changes
      .filter(ch => ch.change === LocalChangeType.delete)
      .forEach(ch => {
        this.cleanupRow(ch.id, ch.on);
      });
  }
}

const storageService = new StorageService();
export default storageService;
