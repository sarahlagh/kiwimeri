import { IonButton, IonIcon } from '@ionic/react';
import { createOutline } from 'ionicons/icons';
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
        <IonIcon icon={createOutline}></IonIcon>
      </IonButton>
    </>
  );
};
export default RenameNodeButton;
