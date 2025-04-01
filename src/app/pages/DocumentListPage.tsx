import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { onTitleChangeFn } from '../../common/events/events';
import { getSearchParams } from '../../common/getSearchParams';
import { GET_FOLDER_ROUTE } from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentNodeBrowserList from '../../documents/components/DocumentNodeBrowserList';
import TemplateMainPage from './TemplateMainPage';

const DocumentListPage = () => {
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const parent = searchParams?.folder || ROOT_FOLDER;
  const folderTitle = documentsService.useDocumentNodeTitle(parent);
  const onFolderTitleChange = onTitleChangeFn(parent);

  useEffect(() => {
    if (searchParams) {
      history.replace(GET_FOLDER_ROUTE(ROOT_FOLDER));
    }
  }, [searchParams !== null]);

  return (
    <TemplateMainPage
      title={folderTitle}
      editable={parent !== ROOT_FOLDER}
      onEdited={onFolderTitleChange}
    >
      <DocumentNodeBrowserList parent={parent}></DocumentNodeBrowserList>
    </TemplateMainPage>
  );
};
export default DocumentListPage;
