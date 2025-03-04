import { IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import documentsService from '../../app/db/documents.service';

type DeleteNoteButtonProps = {
  id: Id;
};
const DeleteNoteButton = ({ id }: DeleteNoteButtonProps) => {
  const history = useHistory();
  function onIonClick(e: { preventDefault: () => void }) {
    e.preventDefault();
    documentsService.deleteDocument(id);
    history.push('/explore');
  }
  return (
    <IonFab slot="fixed" vertical="bottom" horizontal="end">
      <IonFabButton onClick={onIonClick}>
        <IonIcon icon={trashOutline}></IonIcon>
      </IonFabButton>
    </IonFab>
  );
};
export default DeleteNoteButton;
