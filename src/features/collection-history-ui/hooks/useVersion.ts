import { SpaceTables } from '@/core/db/store-constants';
import { useSpaceRow } from '@/core/db/tinybase-hooks';
import { historyService } from '@/domain/collection-history/collection-history.service';
import {
  CollectionItemVersionContentRow,
  CollectionItemVersionRow
} from '@/domain/collection-history/model';
import { CollectionItemVersion } from '@/domain/collection-history/queries/fetchVersionsQuery';
import { Id } from 'tinybase/with-schemas';

export default function useVersion(versionId: Id): CollectionItemVersion {
  const versionRow = useSpaceRow<SpaceTables.History>(
    SpaceTables.History,
    versionId
  ) as CollectionItemVersionRow;
  const contentRow = useSpaceRow<SpaceTables.HistoryContent>(
    SpaceTables.HistoryContent,
    versionRow.contentId
  ) as CollectionItemVersionContentRow;
  return historyService.mapToVersion(versionId, versionRow, contentRow);
}
