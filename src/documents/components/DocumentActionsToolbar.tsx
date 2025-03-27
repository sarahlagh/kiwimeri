import { IonButtons, IonToolbar } from '@ionic/react';
import DeleteDocumentButton from '../../common/buttons/DeleteDocumentButton';

interface DocumentActionsToolbarProps {
  id: string;
}

const DocumentActionsToolbar = ({ id }: DocumentActionsToolbarProps) => {
  return (
    <IonToolbar color="medium">
      <IonButtons slot="end">
        <DeleteDocumentButton id={id} />
      </IonButtons>
    </IonToolbar>
  );
};
export default DocumentActionsToolbar;
