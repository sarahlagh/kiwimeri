import { DOC_PREVIEW_SIZE } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import {
  SpaceCellId,
  SpaceDocContentTableId,
  SpaceTableId
} from '@/core/db/store-schema';
import { MetaField } from '@/core/db/types';
import { getPlainText } from '@/shared/misc/getPlainText';
import { Id } from 'tinybase/with-schemas';
import { statsOnPlainTextCallback } from '../stats/stats-on-change-callback';
import { CollectionItemType } from './collection';
import {
  DerivedPrefix,
  getDerivedId,
  getDerivedTable
} from './document-content';

const listeners: Id[] = [];
const contentListeners: Id[] = [];

function addDerivedContentListener(
  tableId: SpaceDocContentTableId,
  l: DerivedPrefix,
  onPlainTextChange?: (
    rowId: string,
    plainText: string,
    content_meta: MetaField
  ) => void
) {
  contentListeners.push(
    spaceDocContent.addCellListener(
      tableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell) => {
        if (newCell && newCell !== oldCell) {
          const plainText = getPlainText(newCell);
          const previewText = plainText.substring(0, DOC_PREVIEW_SIZE);
          const derivedId = getDerivedId(l, rowId);
          space.setRow(SpaceTables.DerivedPreview, derivedId, {
            previewText
          });
          const derivedTable = getDerivedTable(l);
          if (derivedTable) {
            spaceDocContent.setCell(
              derivedTable,
              rowId,
              'plainText',
              plainText
            );
            const content_meta = spaceDocContent.getCell(
              derivedTable,
              rowId,
              'content_meta'
            ) as MetaField;
            if (onPlainTextChange)
              onPlainTextChange(rowId, plainText, content_meta);
          }
        }
      },
      true
    )
  );
}

function addDerivedRankListeners<T extends SpaceTableId>(
  tableId: T,
  cellId: SpaceCellId<T>,
  rankColumn: SpaceCellId<SpaceTables.DerivedState>,
  onlyDocuments: boolean
) {
  listeners.push(
    space.addTableListener(
      tableId,
      _space => {
        _space.transaction(() => {
          _space
            .getSortedRowIds(tableId, cellId, false)
            .forEach((rowId, idx) => {
              if (!_space.hasRow(SpaceTables.Collection, rowId)) return;
              if (
                onlyDocuments &&
                _space.getCell(SpaceTables.Collection, rowId, 'type') !==
                  CollectionItemType.document
              ) {
                return;
              }
              const existingRank = _space.getCell(
                SpaceTables.DerivedState,
                rowId,
                rankColumn
              );

              if (idx !== existingRank) {
                _space.setCell(
                  SpaceTables.DerivedState,
                  rowId,
                  rankColumn,
                  idx
                );
              }
            });
        });
      },
      true
    )
  );
}

function addDerivedStateListeners() {
  addDerivedRankListeners(
    SpaceTables.Collection,
    'updatedAt',
    'updatedAtRank',
    false
  );
  addDerivedRankListeners(
    SpaceTables.ResumeState,
    'lastOpenedAt',
    'lastOpenedAtRank',
    true
  );
}

export function startDerivedTablesListeners() {
  addDerivedContentListener(
    SpaceDocContentTables.CollectionContent,
    'c',
    statsOnPlainTextCallback
  );
  addDerivedContentListener(SpaceDocContentTables.AnnotationContent, 'a');
  addDerivedStateListeners();
}

export function stopDerivedTablesListeners() {
  listeners.forEach(l => {
    space.delListener(l);
  });
  contentListeners.forEach(l => {
    spaceDocContent.delListener(l);
  });
  listeners.length = 0;
}
