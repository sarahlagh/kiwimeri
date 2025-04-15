import CollectionItemBrowserList from '@/collection/components/CollectionItemBrowserList';
import { onTitleChangeFn } from '@/common/events/events';
import { getSearchParams } from '@/common/getSearchParams';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import { useLocation } from 'react-router';
import TemplateMainPage from './TemplateMainPage';

const CollectionListPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const parent = searchParams?.folder || ROOT_FOLDER;
  const folderTitle = collectionService.useItemTitle(parent);
  const onFolderTitleChange = onTitleChangeFn(parent);

  return (
    <TemplateMainPage
      title={folderTitle}
      editable={parent !== ROOT_FOLDER}
      onEdited={onFolderTitleChange}
    >
      <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
    </TemplateMainPage>
  );
};
export default CollectionListPage;
