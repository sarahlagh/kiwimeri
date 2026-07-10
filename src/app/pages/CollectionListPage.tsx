import { getGlobalTrans } from '@/constants';
import { useCurrentNotebook } from '@/features/collection-notebooks-ui';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { getSearchParams } from '@/shared/utils';
import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router';
import useItemTitle from '../hooks/useItemTitle';
import TemplateMainPage from './TemplateMainPage';

const CollectionItemBrowserList = lazy(() =>
  import('@/features/collection-browser').then(m => ({
    default: m.CollectionItemBrowserList
  }))
);

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
      <Suspense>
        <CollectionItemBrowserList parent={parent}></CollectionItemBrowserList>
      </Suspense>
    </TemplateMainPage>
  );
};
export default CollectionListPage;
