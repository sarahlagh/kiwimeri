import { CollectionItemType } from '@/collection/collection';
import { SpaceQueryDefinition } from '@/core/db/queries-helper';
import { ParamValues } from 'tinybase/with-schemas';

const fetchDocsWithPagesQuery = new SpaceQueryDefinition<
  ParamValues,
  {
    docId: string;
    pagesCount: number;
    folderOrNotebookId?: string;
    title?: string;
    created?: number;
  },
  'collection'
>('fetchDocsWithPages', 'collection', ({ select, where, group, join }) => {
  select('parent');
  group('parent', 'count').as('pagesCount');

  where('type', CollectionItemType.page);
  // select('type');

  select('parent').as('docId');
  join('collection', getCell => `${getCell('parent')}`).as('parentRow');
  select('parentRow', 'title');
  select('parentRow', 'parent').as('folderOrNotebookId');
  select('parentRow', 'created');
});

export default fetchDocsWithPagesQuery;
