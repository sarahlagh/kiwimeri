import { useLingui } from '@lingui/react/macro';
import { useParams } from 'react-router';
import { onTitleChangeFn } from '../../common/events/events';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentList from '../../documents/components/DocumentList';
import TemplateMainPage from './TemplateMainPage';

const DocumentListPage = () => {
  const { t } = useLingui();
  const { parent } = useParams<{ parent: string }>();
  const folderTitle = documentsService.useDocumentNodeTitle(parent) || t`Home`;
  const onFolderTitleChange = onTitleChangeFn(parent);
  return (
    <TemplateMainPage
      title={folderTitle}
      editable={parent !== ROOT_FOLDER}
      onIonInput={onFolderTitleChange}
    >
      <DocumentList parent={parent}></DocumentList>
    </TemplateMainPage>
  );
};
export default DocumentListPage;
