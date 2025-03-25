import { IonButton, IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { GET_FOLDER_ROUTE } from '../routes';

type DeleteDocumentButtonProps = {
  id: Id;
};
const DeleteDocumentButton = ({ id }: DeleteDocumentButtonProps) => {
  const history = useHistory();
  function onIonClick(e: { preventDefault: () => void }) {
    e.preventDefault();
    documentsService.deleteDocument(id);
    history.push(GET_FOLDER_ROUTE(userSettingsService.getCurrentFolder()));
  }
  return (
    <IonButton onClick={onIonClick}>
      <IonIcon icon={trashOutline}></IonIcon>
    </IonButton>
  );
};
export default DeleteDocumentButton;
