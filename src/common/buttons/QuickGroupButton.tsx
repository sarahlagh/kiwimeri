import {
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import { GET_DOCUMENT_ROUTE } from '../routes';

type QuickGroupButtonProps = {
  id: Id;
  type: CollectionItemTypeValues;
  onClose?: (role?: string, data?: string) => void;
};

const QuickGroupButton = ({ id, type, onClose }: QuickGroupButtonProps) => {
  if (type !== CollectionItemType.document) return <></>;
  return (
    <IonButton
      fill="clear"
      onClick={() => {
        // create folder and put current doc in it
        const folder = navService.getCurrentFolder();
        const title = collectionService.getItemTitle(id);
        const { item } = collectionService.getNewFolderObj(folder);
        item.title = title;
        const newParent = collectionService.saveItem(item);
        collectionService.setItemParent(id, newParent);
        if (onClose) onClose('group', GET_DOCUMENT_ROUTE(newParent, id));
      }}
    >
      <IonIcon icon={APPICONS.groupAction}></IonIcon>
    </IonButton>
  );
};
export default QuickGroupButton;
