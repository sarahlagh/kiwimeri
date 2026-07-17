import {
  SID,
  SpaceArchiveTables,
  SpaceTables
} from '@/core/db/store-constants';
import { useSpaceArchiveRow, useSpaceRow } from '@/core/db/tinybase-hooks';
import {
  CollectionItemVersion,
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '@/domain/history/history';
import { historyService } from '@/domain/history/history.service';
import { Id } from 'tinybase/with-schemas';

export default function useVersion(versionId: Id): CollectionItemVersion {
  const versionRow = useSpaceRow<SpaceTables.History>(
    SpaceTables.History,
    versionId
  ) as CollectionItemVersionRow;
  const contentRow = useSpaceArchiveRow<SpaceArchiveTables.HistoryContent>(
    SpaceArchiveTables.HistoryContent,
    versionRow.contentId,
    SID.spaceArchive
  ) as CollectionItemVersionContentRow;
  return historyService.mapToVersion(versionId, versionRow, contentRow);
}
