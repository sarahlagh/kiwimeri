import { GET_FOLDER_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Id } from 'tinybase/with-schemas';

type CloseDocumentButtonProps = {
  id: Id;
  getRoute?: () => string;
  onClose?: (role?: string) => void;
};

const CloseDocumentButton = ({
  id,
  getRoute,
  onClose
}: CloseDocumentButtonProps) => {
  const history = useHistory();
  const parent = collectionService.getItemParent(id);
  const backRoute = getRoute ? getRoute() : GET_FOLDER_ROUTE(parent);
  return (
    <>
      <IonButton
        onClick={() => {
          history.push(backRoute);
          if (onClose) {
            onClose('close');
          }
        }}
      >
        <IonIcon icon={APPICONS.closeAction}></IonIcon>
      </IonButton>
    </>
  );
};
export default CloseDocumentButton;
