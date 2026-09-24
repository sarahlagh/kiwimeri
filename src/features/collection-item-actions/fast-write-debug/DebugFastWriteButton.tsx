import { APPICONS } from '@/constants';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';
import DebugFastWriteModal from './DebugFastWriteModal';

type DebugFastWriteButtonProps = {
  id: Id;
};

const DebugFastWriteButton = ({ id }: DebugFastWriteButtonProps) => {
  const [present, dismiss] = useIonModal(DebugFastWriteModal, {
    id,
    onClose: (parentId?: string) => {
      dismiss(parentId, parentId === undefined ? 'cancel' : 'choose');
    }
  });
  return (
    <IonButton
      expand="block"
      onClick={() => {
        present({ cssClass: 'fixed-width-modal' });
      }}
    >
      <IonIcon icon={APPICONS.devToolsPage}></IonIcon>
    </IonButton>
  );
};
export default DebugFastWriteButton;
