import ConfirmYesNoDialog from '@/common/modals/ConfirmYesNoDialog';
import { GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';

type DeleteItemButtonProps = {
  id: Id;
  onClose?: (role?: string) => void;
};

const DeleteItemButton = ({ id, onClose }: DeleteItemButtonProps) => {
  const history = useHistory();
  return (
    <>
      <IonButton id="open-modal-delete-item" expand="block">
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
      <ConfirmYesNoDialog
        trigger="open-modal-delete-item"
        onClose={confirmed => {
          if (confirmed) {
            collectionService.deleteItem(id);
            if (history) {
              history.replace(
                GET_FOLDER_ROUTE(userSettingsService.getCurrentFolder())
              );
            }
          }
          if (onClose) onClose(confirmed ? 'confirm' : 'cancel');
        }}
      />
    </>
  );
};
export default DeleteItemButton;
