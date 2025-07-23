import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import { onTitleChangeFn } from '@/common/events/events';
import { getSearchParams } from '@/common/utils';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { useLocation } from 'react-router';
import TemplateMainPage from './TemplateMainPage';

const CollectionListPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = notebooksService.useCurrentNotebook();
  const parent = searchParams?.folder || notebook;
  const folderTitle = collectionService.useItemTitle(parent);
  const onFolderTitleChange = onTitleChangeFn(parent);

  return (
    <TemplateMainPage
      title={folderTitle}
      editable={parent !== notebook}
      onEdited={onFolderTitleChange}
    >
      <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
    </TemplateMainPage>
  );
};
export default CollectionListPage;
