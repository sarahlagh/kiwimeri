import { appConfig } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { space, spaceArchive, spaceDocContent } from '@/core/db/store';
import {
  SpaceArchiveTables,
  SpaceDocContentTables,
  SpaceTables
} from '@/core/db/store-constants';
import {
  SpaceDocContentTableId,
  SpaceDocContentTablesType,
  SpaceDocContentType,
  SpaceTableId,
  SpaceTablesType,
  SpaceType
} from '@/core/db/store-schema';
import { AsId } from '@/core/db/types';
import { cellEquals } from '@/shared/utils';
import { Content, Id, Table } from 'tinybase/with-schemas';
import {
  BaseCollectionItem,
  CollectionItemRow,
  CollectionItemType,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdatableFields,
  isDocument
} from '../collection/collection';
import collectionService from '../collection/collection.service';
import { annotsService } from '../collection/doc-annotations.service';
import {
  BaseDocAnnotation,
  DocAnnotationRow,
  DocAnnotationUpdatableFields
} from '../collection/document-annotations';
import { ContentRow, getContentTable } from '../collection/document-content';
import { resumeService } from '../collection/resume-state.service';
import {
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '../history/history';
import { historyService } from '../history/history.service';
import { DocumentStatRow } from '../stats/stats';
import { LocalChangeType } from '../synchronization/local-changes';
import {
  BaseUserPreference,
  UserPreferenceRow,
  UserPrefUpdatableFields
} from '../user-preferences/user-preferences';
import {
  AfterMergeChange,
  isUserPref,
  SpacePortableData,
  SpacePortableDataKey,
  SpacePortableDataTableType,
  SpacePortableDataWithHistory,
  TableOf
} from './types';

const C = SpaceTables.Collection;
const A = SpaceTables.Annotations;
const UP = SpaceTables.UserPreference;
const H = SpaceArchiveTables.History;
const HC = SpaceArchiveTables.HistoryContent;
const S = SpaceTables.Stats;
const CC = SpaceDocContentTables.CollectionContent;
const AC = SpaceDocContentTables.AnnotationContent;

const LOCAL_COLLECTION_SCHEMA_VERSION = 2; // increment each breaking change
const MIN_LOCAL_COLLECTION_SCHEMA_VERSION = 1;

class StorageMergeService {
  public getSpaceRepresentation(
    schemaVersion = LOCAL_COLLECTION_SCHEMA_VERSION
  ): SpacePortableData {
    const localSpaceContent = space.getContent();
    const localSpaceDocContentContent = spaceDocContent.getContent();
    return this.buildSpaceRepresentation(
      localSpaceContent,
      localSpaceDocContentContent,
      schemaVersion
    );
  }

  private buildSpaceRepresentation(
    localSpaceContent: Content<SpaceType>,
    localSpaceDocContentContent: Content<SpaceDocContentType>,
    schemaVersion = LOCAL_COLLECTION_SCHEMA_VERSION
  ): SpacePortableData {
    const items = this.toTable<BaseCollectionItem, CollectionItemRow>(
      localSpaceContent[0][C],
      localSpaceDocContentContent[0][CC],
      row => ({ ...row, itemId: undefined })
    );
    const annots = this.toTable<BaseDocAnnotation, DocAnnotationRow>(
      localSpaceContent[0][A],
      localSpaceDocContentContent[0][AC]
    );
    const userPrefs = this.toTable<BaseUserPreference, UserPreferenceRow>(
      localSpaceContent[0][UP]
    );
    const lastChange = Math.max(
      ...Object.keys(items).map(rowId => items[rowId].updatedAt),
      ...Object.keys(annots).map(rowId => annots[rowId].updatedAt),
      ...Object.keys(userPrefs).map(rowId => userPrefs[rowId].updatedAt)
    );
    return structuredClone({
      items,
      annots,
      userPrefs,
      lastChange,
      schemaVersion
    });
  }

  private toTable<T, U>(
    arg: Table<SpaceTablesType, SpaceTableId, false> | undefined,
    argContent?:
      | Table<SpaceDocContentTablesType, SpaceDocContentTableId, false>
      | undefined,
    rowMapper?: (row: U, rowId: Id) => T
  ): TableOf<T> {
    const table: TableOf<T> = {};
    if (arg) {
      Object.keys(arg).forEach(rowId => {
        const contentRow = (
          argContent ? argContent[rowId] : {}
        ) as Partial<ContentRow>;
        const contentAddition = {
          content: contentRow?.content,
          content_meta: contentRow?.content_meta
        };
        const row = arg[rowId] as U;
        table[rowId] = {
          ...contentAddition,
          ...(rowMapper ? rowMapper(row, rowId) : (row as unknown as T))
        };
      });
    }
    return table;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private excludePlainText(baseTables: any, tableId: string) {
    if (baseTables[tableId])
      Object.keys(baseTables[tableId]).forEach(rowId => {
        delete baseTables[tableId]![rowId].plainText;
      });
  }

  public exportJson(withHistory: boolean) {
    const content = space.getContent();
    const docContent = spaceDocContent.getContent();
    const baseTables = {
      collection: content[0].collection,
      document_annotation: content[0].document_annotation,
      collection_content: docContent[0].collection_content,
      document_annotation_content: docContent[0].document_annotation_content
    };
    // remove plainText
    this.excludePlainText(baseTables, CC);
    this.excludePlainText(baseTables, AC);

    const baseValues = {
      appVersion: appConfig.KIWIMERI_VERSION,
      schemaVersion: LOCAL_COLLECTION_SCHEMA_VERSION
    };
    if (!withHistory) {
      return JSON.stringify([baseTables, baseValues]);
    }
    const archive_content = spaceArchive.getContent();
    return JSON.stringify([
      {
        ...baseTables,
        history: archive_content[0].history,
        history_content: archive_content[0].history_content,
        stats: content[0].stats
      },
      baseValues
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private guessSchemaVersion(tables: any, values?: any) {
    // 0.4.1 => changes display_opts -> settings field among other, not accepted for restoreJson
    // 0.4.2 => no change on exported tables
    // 0.4.3 => moves history content to store but has no incidence on exported schema
    // 0.4.4 => no change on exported tables
    // 0.4.5 => content moved to CollectionContent & AnnotationContent tables
    //          + exports schemaVersion=2 and appVersion
    // oldest accepted version = 0.4.2 (assume schemaVersion=1)
    let schemaVersion = values?.schemaVersion;
    // attempt to guess schemaVersion
    if (typeof schemaVersion === 'string') return 0;
    if (schemaVersion === undefined) {
      if (
        !tables.collection ||
        tables.collection[DEFAULT_NOTEBOOK_ID].display_opts
      ) {
        schemaVersion = 0;
      }
      if (
        tables.collection &&
        tables.collection[DEFAULT_NOTEBOOK_ID].settings !== undefined
      ) {
        schemaVersion = 1;
      }
    }
    return schemaVersion;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private migrateContentToTable(tables: any) {
    if (tables[CC] !== undefined) return; // skip
    tables[CC] = {};
    tables[AC] = {};
    Object.keys(tables[C]).forEach(rowId => {
      if (tables[C][rowId].content !== undefined) {
        tables[CC] = {
          content: tables[C].content,
          content_meta: tables[C].content_meta
        };
      }
    });
    Object.keys(tables[A]).forEach(rowId => {
      if (tables[A][rowId].content !== undefined) {
        tables[AC] = {
          content: tables[C].content,
          content_meta: tables[C].content_meta
        };
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAndValidate(json: any): SpacePortableDataWithHistory {
    const [tables, values] = json;
    const schemaVersion = this.guessSchemaVersion(tables, values);
    if (schemaVersion < MIN_LOCAL_COLLECTION_SCHEMA_VERSION) {
      throw new Error(
        `Version mismatch on schemaVersion: expected at least ${MIN_LOCAL_COLLECTION_SCHEMA_VERSION}, got ${schemaVersion}`
      );
    }

    if (schemaVersion === 1) {
      // from before change for content, migrate
      this.migrateContentToTable(tables);
    }

    const newContent: SpacePortableDataWithHistory =
      this.buildSpaceRepresentation(json, json, schemaVersion);
    if (tables.history) {
      newContent.history = this.toTable<
        CollectionItemVersionRow,
        CollectionItemVersionRow
      >(tables.history);
    }
    if (tables.history_content) {
      newContent.historyContent = this.toTable<
        CollectionItemVersionContentRow,
        CollectionItemVersionContentRow
      >(tables.history_content);
    }
    if (tables.stats) {
      newContent.stats = this.toTable<DocumentStatRow, DocumentStatRow>(
        tables.stats
      );
    }
    return newContent;
  }

  /// from restore button
  public restoreJson(content: string) {
    const json = JSON.parse(content);
    const localContent = this.getSpaceRepresentation();
    const newContent = this.parseAndValidate(json);

    space.transaction(() => {
      this.setContent(newContent, false);
      if (newContent.history) {
        spaceArchive.setTable(H, newContent.history);
      }
      if (newContent.historyContent) {
        spaceArchive.setTable(HC, newContent.historyContent);
      }
    });
    if (newContent.stats) {
      space.setTable(S, newContent.stats);
    }

    const changes = this.afterMergeChanges(newContent, localContent);
    space.delTable(SpaceTables.ResumeState);
    this.handleDeletedRows(changes);
    this.handleHistory(changes);
  }

  /// from synchronizer
  public restoreContent(
    content: SpacePortableData,
    changes: AfterMergeChange[]
  ) {
    this.setContent(content, true);
    this.handleResumeState(changes);
    this.handleDeletedRows(changes);
    this.handleHistory(changes);
  }

  public afterMergeChanges(
    newLocalContent: SpacePortableData,
    localContent: SpacePortableData
  ) {
    let changes: AfterMergeChange[] = [];
    changes = [
      ...changes,
      ...this.diffTable(
        C,
        'items',
        newLocalContent,
        localContent,
        CollectionItemUpdatableFields
      ),
      ...this.diffTable(
        A,
        'annots',
        newLocalContent,
        localContent,
        DocAnnotationUpdatableFields
      ),
      ...this.diffTable(
        UP,
        'userPrefs',
        newLocalContent,
        localContent,
        UserPrefUpdatableFields
      )
    ];
    return changes;
  }

  private diffTable<K extends SpacePortableDataKey>(
    tableId: SpaceTableId,
    itemsKey: K,
    newLocalContent: SpacePortableData,
    localContent: SpacePortableData,
    updatableFields: AsId<keyof SpacePortableDataTableType<K>>[]
  ) {
    const changes: Map<string, AfterMergeChange> = new Map();
    const ids = new Set<string>([
      ...Object.keys(newLocalContent[itemsKey]),
      ...Object.keys(localContent[itemsKey])
    ]);
    ids.forEach(id => {
      const newItem = newLocalContent[itemsKey]
        ? (newLocalContent[itemsKey][id] as SpacePortableDataTableType<K>)
        : undefined;
      const oldItem = localContent[itemsKey]
        ? (localContent[itemsKey][id] as SpacePortableDataTableType<K>)
        : undefined;
      if (newItem && !oldItem) {
        const isConflict =
          !isUserPref(newItem) && newItem.conflictId !== undefined;
        if (!isConflict) {
          const type = isUserPref(newItem) ? undefined : newItem.type;
          // added by remote
          changes.set(id, {
            id,
            type,
            on: tableId,
            change: LocalChangeType.add
          });
        }
      } else if (!newItem && oldItem) {
        // deleted by remote
        const type = isUserPref(oldItem) ? undefined : oldItem.type;
        changes.set(id, {
          id,
          on: tableId,
          type,
          change: LocalChangeType.delete
        });
      } else if (newItem && oldItem) {
        const type = isUserPref(newItem) ? undefined : newItem.type;
        for (const field of updatableFields) {
          // only create change for the first field
          // if local wins, mustn't have new version - won't happen if no local change
          if (!cellEquals(oldItem[field], newItem[field])) {
            changes.set(id, {
              id,
              type,
              on: tableId,
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

  private setContent(content: SpacePortableData, withUserPrefs: boolean) {
    spaceDocContent.startTransaction();
    space.startTransaction();
    try {
      this.setWithContent(structuredClone(content), 'items', C);
      collectionService.backfillProjectedStates(content.items);
      this.setWithContent(structuredClone(content), 'annots', A);

      if (withUserPrefs) {
        this.set(structuredClone(content), 'userPrefs', UP);
      }
    } finally {
      // TODO handle error
      space.finishTransaction();
      spaceDocContent.finishTransaction();
    }
    collectionService.updateUpdatedAtRank();
  }

  private setWithContent(
    content: SpacePortableData,
    itemsKey: SpacePortableDataKey,
    tableId: SpaceTableId
  ) {
    space.delTable(tableId);
    const contentTable = getContentTable(tableId);
    Object.keys(content[itemsKey]).forEach(rowId => {
      const row = content[itemsKey][rowId] as
        | BaseCollectionItem
        | BaseDocAnnotation;
      if (row.content !== undefined && contentTable) {
        spaceDocContent.setPartialRow(contentTable, rowId, {
          content: row.content,
          content_meta: row.content_meta
        });
      }
      delete row.content;
      delete row.content_meta;
      space.setRow(tableId, rowId, row);
    });
  }

  private set(
    content: SpacePortableData,
    itemsKey: SpacePortableDataKey,
    tableId: SpaceTableId
  ) {
    space.delTable(tableId);
    Object.keys(content[itemsKey]).forEach(rowId => {
      const row = content[itemsKey][rowId];
      space.setRow(tableId, rowId, row);
    });
  }

  private handleResumeState(changes: AfterMergeChange[]) {
    // reset resume state if content has changed
    changes
      .filter(ch => isDocument(ch.type) && ch.field === 'content')
      .forEach(ch => resumeService.setLastSelection(ch.id, null));
  }

  private handleHistory(changes: AfterMergeChange[]) {
    // no local change, remote change on hist field                 => new version
    // local change, no remote change                               => no new version
    // local change, remote change on hist field, local wins        => no new version
    // local change, remote change on hist field, remote wins       => new version

    // history must be updated
    const docsMap = new Map<string, AfterMergeChange>();
    changes
      .filter(ch => isDocument(ch.type))
      .filter(
        ch =>
          ch.field === undefined ||
          collectionService.isHistorizableContentChange(
            CollectionItemType.document,
            ch.field as CollectionItemUpdatableFieldEnum
          )
      )
      .forEach(ch => docsMap.set(ch.id, ch));

    [...docsMap.values()].forEach(ch => {
      historyService.updateAfterSync(ch);
    });
    historyService.gc();
  }

  private handleDeletedRows(changes: AfterMergeChange[]) {
    changes
      .filter(ch => ch.change === LocalChangeType.delete)
      .forEach(ch => {
        this.cleanupRow(ch.id, ch.on);
      });
  }

  private cleanupRow(rowId: string, on: SpaceTableId) {
    if (on === SpaceTables.Collection) {
      collectionService.cleanupDeletedItem(rowId);
    }
    if (on === SpaceTables.Annotations) {
      annotsService.cleanupDeletedAnnot(rowId);
    }
  }
}

export const storageMergeService = new StorageMergeService();
