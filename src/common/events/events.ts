import collectionService from '@/db/collection.service';
import { Id } from 'tinybase/common/with-schemas';

export const onTitleChangeFn = (id: Id) => {
  return (textEdited: string) => {
    collectionService.setItemTitle(id, textEdited);
  };
};
