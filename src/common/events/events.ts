import { Id } from 'tinybase/common/with-schemas';
import documentsService from '../../db/documents.service';

export const onTitleChangeFn = (id: Id) => {
  return (textEdited: string) => {
    documentsService.setDocumentNodeTitle(id, textEdited);
  };
};
