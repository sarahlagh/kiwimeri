import documentsService from '@/db/documents.service';
import { Id } from 'tinybase/common/with-schemas';

export const onTitleChangeFn = (id: Id) => {
  return (textEdited: string) => {
    documentsService.setDocumentNodeTitle(id, textEdited);
  };
};
