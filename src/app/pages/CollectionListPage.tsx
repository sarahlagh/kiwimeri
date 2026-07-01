import { getGlobalTrans } from '@/constants';
import { CollectionItemBrowserList } from '@/features/collection-browser';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { getSearchParams } from '@/shared/utils';
import { useLocation } from 'react-router';
import useItemTitle from '../hooks/useItemTitle';
import TemplateMainPage from './TemplateMainPage';

const CollectionListPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const notebook = useCurrentNotebook();
  const parent = searchParams?.folder || notebook;
  const folderTitle = useItemTitle(parent);

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
