import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import { APPICONS } from '../../constants';
import documentsService from '../../db/documents.service';
import ChooseFolderModal from '../modals/ChooseFolderModal';

type MoveFolderButtonProps = {
  id: Id;
  onClose: (role?: string) => void;
};

const MoveFolderButton = ({ id, onClose }: MoveFolderButtonProps) => {
  const currentParent = documentsService.getDocumentNodeParent(id);
  const currentType = documentsService.getDocumentType(id);

  const [present, dismiss] = useIonModal(ChooseFolderModal, {
    id,
    currentType,
    currentParent,
    onClose: (parentId?: string) => {
      if (parentId && parentId !== currentParent) {
        documentsService.setDocumentNodeParent(id, parentId);
      }
      dismiss(parentId, parentId === undefined ? 'cancel' : 'choose');
      onClose(parentId !== undefined ? 'confirm' : 'cancel');
    }
  });
  return (
    <>
      <IonButton
        expand="block"
        onClick={() => {
          present();
        }}
      >
        <IonIcon icon={APPICONS.moveAction}></IonIcon>
      </IonButton>
    </>
  );
};
export default MoveFolderButton;
