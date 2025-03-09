import { IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import documentsService from '../../db/documents.service';

type DeleteDocumentButtonProps = {
  id: Id;
};
const DeleteDocumentButton = ({ id }: DeleteDocumentButtonProps) => {
  const history = useHistory();
  function onIonClick(e: { preventDefault: () => void }) {
    e.preventDefault();
    documentsService.deleteDocument(id);
    history.push('/collection');
  }
  return (
    <IonFab slot="fixed" vertical="bottom" horizontal="end">
      <IonFabButton onClick={onIonClick}>
        <IonIcon icon={trashOutline}></IonIcon>
      </IonFabButton>
    </IonFab>
  );
};
export default DeleteDocumentButton;
