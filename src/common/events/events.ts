import { Id } from 'tinybase/common/with-schemas';
import documentsService from '../../db/documents.service';

export const onTitleChangeFn = (id: Id) => {
  return (event: Event) => {
    const title = (event.target as HTMLInputElement).value;
    documentsService.setDocumentTitle(id, title);
  };
};

export const onContentChangeFn = (id: Id) => {
  return (event: Event) => {
    const content = (event.target as HTMLInputElement).value;
    documentsService.setDocumentContent(id, content);
  };
};
