import { IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import { APPICONS } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import ConfirmYesNoDialog from '../modals/ConfirmYesNoDialog';
import { GET_FOLDER_ROUTE } from '../routes';

type DeleteNodeButtonProps = {
  id: Id;
  onClose?: (role?: string) => void;
};

const DeleteNodeButton = ({ id, onClose }: DeleteNodeButtonProps) => {
  const history = useHistory();
  return (
    <>
      <IonButton id="open-modal-delete-document-node" expand="block">
        <IonIcon icon={APPICONS.deleteAction}></IonIcon>
      </IonButton>
      <ConfirmYesNoDialog
        trigger="open-modal-delete-document-node"
        onClose={confirmed => {
          if (confirmed) {
            documentsService.deleteNodeDocument(id);
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
export default DeleteNodeButton;
