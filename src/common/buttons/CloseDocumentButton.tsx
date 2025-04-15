import { GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';

type CloseDocumentButtonProps = {
  id: Id;
  onClose?: (role?: string) => void;
};

const CloseDocumentButton = ({ id }: CloseDocumentButtonProps) => {
  const history = useHistory();
  const parent = collectionService.getItemParent(id);
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
