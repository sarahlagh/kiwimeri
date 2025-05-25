import ChooseFolderModal from '@/common/modals/ChooseFolderModal';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';

type MoveFolderButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const MoveFolderButton = ({ id, onClose }: MoveFolderButtonProps) => {
  const currentParent = collectionService.getItemParent(id);
  const currentType = collectionService.getItemType(id);

  const [present, dismiss] = useIonModal(ChooseFolderModal, {
    id,
    currentType,
    currentParent,
    onClose: (parentId?: string, notebookId?: string) => {
      if (notebookId && parentId) {
        collectionService.setItemParent(id, parentId, notebookId);
      } else if (parentId && parentId !== currentParent) {
        collectionService.setItemParent(id, parentId);
      }
      dismiss(parentId, parentId === undefined ? 'cancel' : 'choose');
      onClose(parentId !== undefined ? 'confirm' : 'cancel');
    }
  });
  return (
    <IonButton
      expand="block"
      onClick={() => {
        present();
      }}
    >
      <IonIcon icon={APPICONS.moveAction}></IonIcon>
    </IonButton>
  );
};
export default MoveFolderButton;
