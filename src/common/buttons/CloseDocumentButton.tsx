import { IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';
import { APPICONS } from '../../constants';
import documentsService from '../../db/documents.service';
import { GET_FOLDER_ROUTE } from '../routes';

type CloseDocumentButtonProps = {
  id: Id;
  onClose?: (role?: string) => void;
};

const CloseDocumentButton = ({ id }: CloseDocumentButtonProps) => {
  const history = useHistory();
  const parent = documentsService.getDocumentNodeParent(id);
  return (
    <>
      <IonButton
        onClick={() => {
          history.push(GET_FOLDER_ROUTE(parent));
        }}
      >
        <IonIcon icon={APPICONS.closeAction}></IonIcon>
      </IonButton>
    </>
  );
};
export default CloseDocumentButton;
