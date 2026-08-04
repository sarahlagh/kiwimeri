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

const listeners: Id[] = [];
const contentListeners: Id[] = [];

function addDerivedContentListener(
  contentTableId: SpaceDocContentTableId,
  viewTableId: SpaceTableId,
  onPlainTextChange?: (
    rowId: string,
    plainText: string,
    content_meta: MetaField
  ) => void
) {
  contentListeners.push(
    spaceDocContent.addCellListener(
      contentTableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell, oldCell) => {
        if (newCell && newCell !== oldCell) {
          const plainText = getPlainText(newCell);
          const previewText = plainText.substring(0, DOC_PREVIEW_SIZE);
          space.setRow(viewTableId, rowId, {
            previewText
          });
          spaceDocContent.setCell(
            contentTableId,
            rowId,
            'plainText',
            plainText
          );
          const content_meta = spaceDocContent.getCell(
            contentTableId,
            rowId,
            'content_meta'
          ) as MetaField;
          if (onPlainTextChange)
            onPlainTextChange(rowId, plainText, content_meta);
        }
      },
      true
    )
  );
}

function addProjectedRankListeners<T extends SpaceTableId>(
  tableId: T,
  cellId: SpaceCellId<T>,
  rankColumn: SpaceCellId<SpaceTables.CollectionItemView>,
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
                SpaceTables.CollectionItemView,
                rowId,
                rankColumn
              );

              if (idx !== existingRank) {
                _space.setCell(
                  SpaceTables.CollectionItemView,
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

function addProjectedStateListeners() {
  addProjectedRankListeners(
    SpaceTables.Collection,
    'updatedAt',
    'updatedAtRank',
    false
  );
  addProjectedRankListeners(
    SpaceTables.ResumeState,
    'lastOpenedAt',
    'lastOpenedAtRank',
    true
  );
}

export function startDerivedTablesListeners() {
  addDerivedContentListener(
    SpaceDocContentTables.CollectionContent,
    SpaceTables.CollectionItemView,
    statsOnPlainTextCallback
  );
  addDerivedContentListener(
    SpaceDocContentTables.AnnotationContent,
    SpaceTables.AnnotationView
  );
  addProjectedStateListeners();
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
