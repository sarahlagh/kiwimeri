import { onTitleChangeFn } from '@/common/events/events';
import { getSearchParams } from '@/common/getSearchParams';
import { ROOT_FOLDER } from '@/constants';
import documentsService from '@/db/documents.service';
import DocumentNodeBrowserList from '@/documents/components/DocumentNodeBrowserList';
import { useLocation } from 'react-router';
import TemplateMainPage from './TemplateMainPage';

const DocumentListPage = () => {
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const parent = searchParams?.folder || ROOT_FOLDER;
  const folderTitle = documentsService.useDocumentNodeTitle(parent);
  const onFolderTitleChange = onTitleChangeFn(parent);

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
