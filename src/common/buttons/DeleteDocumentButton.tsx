import { IonButton, IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import ConfirmYesNoDialog from '../modals/ConfirmYesNoDialog';
import { GET_FOLDER_ROUTE } from '../routes';

type DeleteDocumentButtonProps = {
  id: Id;
  onClose?: (confirmed: boolean) => void;
};

const DeleteDocumentButton = ({ id, onClose }: DeleteDocumentButtonProps) => {
  const history = useHistory();
  return (
    <>
      <IonButton id="open-modal" expand="block">
        <IonIcon icon={trashOutline}></IonIcon>
      </IonButton>
      <ConfirmYesNoDialog
        trigger="open-modal"
        onClose={confirmed => {
          if (confirmed) {
            documentsService.deleteNodeDocument(id);
            if (history) {
              history.push(
                GET_FOLDER_ROUTE(userSettingsService.getCurrentFolder())
              );
            }
          }
          if (onClose) onClose(confirmed);
        }}
      />
    </>
  );
};
export default DeleteDocumentButton;
