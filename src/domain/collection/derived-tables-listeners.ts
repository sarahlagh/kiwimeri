import { appConfig } from '@/config';
import { DOC_PREVIEW_SIZE } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { SpaceDocContentTableId, SpaceTableId } from '@/core/db/store-schema';
import { MetaField } from '@/core/db/types';
import { schedule } from '@/core/tasks/scheduler.service';
import { getPlainText } from '@/shared/misc/getPlainText';
import { Id } from 'tinybase/with-schemas';
import { statsOnPlainTextCallback } from '../stats/stats-on-change-callback';

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
  const taskName = 'calc_' + contentTableId;
  schedule.register(taskName, inputs => {
    if (!inputs) return;
    const { rowId } = inputs;
    const content = spaceDocContent.getCell(contentTableId, rowId, 'content');
    if (!content) return;
    const plainText = getPlainText(content as string);
    const previewText = plainText.substring(0, DOC_PREVIEW_SIZE);
    space.setRow(viewTableId, rowId, {
      previewText
    });
    spaceDocContent.setCell(contentTableId, rowId, 'plainText', plainText);
    const content_meta = spaceDocContent.getCell(
      contentTableId,
      rowId,
      'content_meta'
    ) as MetaField;
    if (onPlainTextChange) onPlainTextChange(rowId, plainText, content_meta);
  });

  contentListeners.push(
    spaceDocContent.addCellListener(
      contentTableId,
      null,
      'content',
      (_store, tableId, rowId, cellId, newCell) => {
        // if (!newCell || cellEquals(newCell, oldCell)) return;
        if (!newCell) return;
        schedule.in(appConfig.WRITER_DERIVED_STATS_THROTTLE, taskName, {
          rowId
        });
      },
      true
    )
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
}

export function callDerivedTablesListeners() {
  contentListeners.forEach(l => {
    spaceDocContent.callListener(l);
  });
}

export function stopDerivedTablesListeners() {
  contentListeners.forEach(l => {
    spaceDocContent.delListener(l);
  });
  contentListeners.length = 0;
}
