import CollectionItemBrowserList from '@/collection_to_migrate/components/CollectionItemBrowserList';
import { onTitleChangeFn } from '@/common_to_migrate/events/events';
import { getSearchParams } from '@/common_to_migrate/utils';
import { getGlobalTrans } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import { useCurrentNotebook } from '@/features/notebooks-ui';
import { useLocation } from 'react-router';
import TemplateMainPage from './TemplateMainPage';

const CollectionListPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = useCurrentNotebook();
  const parent = searchParams?.folder || notebook;
  const folderTitle = collectionService.useItemTitle(parent);

  const title = notebook !== parent ? folderTitle : getGlobalTrans().homeTitle;
  const onFolderTitleChange = onTitleChangeFn(parent);

  return (
    <TemplateMainPage
      title={title}
      editable={parent !== notebook}
      onEdited={onFolderTitleChange}
    >
      <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
    </TemplateMainPage>
  );
};
export default CollectionListPage;
