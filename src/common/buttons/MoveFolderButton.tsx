import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { albumsOutline } from 'ionicons/icons';
import { Id } from 'tinybase/with-schemas';
import documentsService from '../../db/documents.service';
import ChooseFolderModal from '../modals/ChooseFolderModal';

type MoveFolderButtonProps = {
  id: Id;
  onClose: (confirmed: boolean) => void;
};

const MoveFolderButton = ({ id, onClose }: MoveFolderButtonProps) => {
  const currentParent = documentsService.getDocumentNodeParent(id);

  const [present, dismiss] = useIonModal(ChooseFolderModal, {
    currentParent,
    onClose: (parentId?: string) => {
      if (parentId && parentId !== currentParent) {
        documentsService.setDocumentNodeParent(id, parentId);
      }
      dismiss(parentId, parentId === undefined ? 'cancel' : 'choose');
      onClose(parentId !== undefined);
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
        {/* TODO change icon */}
        <IonIcon icon={albumsOutline}></IonIcon>
      </IonButton>
    </>
  );
};
export default MoveFolderButton;
