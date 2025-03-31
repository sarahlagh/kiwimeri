import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { onTitleChangeFn } from '../../common/events/events';
import { useSearchParams } from '../../common/hooks/useSearchParams';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import BrowseDocumentList from '../../documents/components/BrowseDocumentList';
import TemplateMainPage from './TemplateMainPage';

const DocumentListPage = () => {
  const location = useLocation();
  const history = useHistory();
  const searchParams = useSearchParams();
  const parent = searchParams?.folder || ROOT_FOLDER;
  const folderTitle = documentsService.useDocumentNodeTitle(parent);
  const onFolderTitleChange = onTitleChangeFn(parent);

  useEffect(() => {
    if (searchParams) {
      history.push({
        pathname: location.pathname,
        search: `?folder=${parent}`
      });
    }
  }, [searchParams !== null]);

  return (
    <TemplateMainPage
      title={folderTitle}
      editable={parent !== ROOT_FOLDER}
      onEdited={onFolderTitleChange}
    >
      <BrowseDocumentList parent={parent}></BrowseDocumentList>
    </TemplateMainPage>
  );
};
export default DocumentListPage;
