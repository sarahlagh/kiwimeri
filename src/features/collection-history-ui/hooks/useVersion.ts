import {
  SID,
  SpaceContentTables,
  SpaceTables
} from '@/core/db/store-constants';
import { useSpaceContentRow, useSpaceRow } from '@/core/db/tinybase-hooks';
import {
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '@/domain/history/history';
import { historyService } from '@/domain/history/history.service';
import { CollectionItemVersion } from '@/domain/history/queries/fetchVersionsQuery';
import { Id } from 'tinybase/with-schemas';

export default function useVersion(versionId: Id): CollectionItemVersion {
  const versionRow = useSpaceRow<SpaceTables.History>(
    SpaceTables.History,
    versionId
  ) as CollectionItemVersionRow;
  const contentRow = useSpaceContentRow<SpaceContentTables.HistoryContent>(
    SpaceContentTables.HistoryContent,
    versionRow.contentId,
    SID.spaceContent
  ) as CollectionItemVersionContentRow;
  return historyService.mapToVersion(versionId, versionRow, contentRow);
}
