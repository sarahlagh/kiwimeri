import { APPMSG } from '@/constants';
import notebooksService from '@/domain/collection/notebooks.service';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';
import { useCurrentFolder } from '../context/RouteContext';
import useItemTitle from '../hooks/useItemTitle';
import TemplateMainPage from './TemplateMainPage';

const CollectionItemBrowserList = lazy(() =>
  import('@/features/collection-browser').then(m => ({
    default: m.CollectionItemBrowserList
  }))
);

const CollectionListPage = () => {
  const { i18n } = useLingui();
  const notebook = notebooksService.getCurrentNotebook();
  const parent = useCurrentFolder();
  const folderTitle = useItemTitle(parent);

  const title = notebook !== parent ? folderTitle : i18n._(APPMSG.homeTitle);
  const onFolderTitleChange = onTitleChangeFn(parent);

  return (
    <TemplateMainPage
      title={title}
      editable={parent !== notebook}
      onEdited={onFolderTitleChange}
    >
      <Suspense>
        <CollectionItemBrowserList
          parentId={parent}
        ></CollectionItemBrowserList>
      </Suspense>
    </TemplateMainPage>
  );
};
export default CollectionListPage;
