import { APPICONS } from '@/constants';
import { IonButton, IonIcon } from '@ionic/react';
import { Id } from 'tinybase/with-schemas';

type RenameNodeButtonProps = {
  id: Id;
  onClose: (role?: string, data?: unknown) => void;
};

const RenameNodeButton = ({ id, onClose }: RenameNodeButtonProps) => {
  return (
    <>
      <IonButton
        expand="block"
        onClick={() => {
          onClose('rename', id);
        }}
      >
        <IonIcon icon={APPICONS.renameAction}></IonIcon>
      </IonButton>
    </>
  );
};
export default RenameNodeButton;
