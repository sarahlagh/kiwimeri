import { SID, SpaceArchiveTables } from '@/core/db/store-constants';
import { useSpaceArchiveRow } from '@/core/db/tinybase-hooks';
import {
  CollectionItemVersion,
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '@/domain/history/history';
import { historyService } from '@/domain/history/history.service';
import { Id } from 'tinybase/with-schemas';

export default function useVersion(versionId: Id): CollectionItemVersion {
  const versionRow = useSpaceArchiveRow<SpaceArchiveTables.History>(
    SpaceArchiveTables.History,
    versionId,
    SID.spaceArchive
  ) as CollectionItemVersionRow;
  const contentRow = useSpaceArchiveRow<SpaceArchiveTables.HistoryContent>(
    SpaceArchiveTables.HistoryContent,
    versionRow.contentId,
    SID.spaceArchive
  ) as CollectionItemVersionContentRow;
  return historyService.mapToVersion(versionId, versionRow, contentRow);
}
