import { Id } from 'tinybase/common/with-schemas';
import documentsService from '../../db/documents.service';

export const onTitleChangeFn = (id: Id) => {
  return (event: Event) => {
    const title = (event.target as HTMLInputElement).value;
    documentsService.setDocumentTitle(id, title);
  };
};
