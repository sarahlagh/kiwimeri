import { GET_FOLDER_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/domain/collection/collection.service';
import { IonButton, IonIcon } from '@ionic/react';
import { useNavigate } from 'react-router';
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
  const navigate = useNavigate();
  const parent = collectionService.getItemParent(id);
  const backRoute = getRoute ? getRoute() : GET_FOLDER_ROUTE(parent);
  return (
    <>
      <IonButton
        onClick={() => {
          navigate(backRoute);
          if (onClose) {
            onClose('close');
          }
        }}
      >
        <IonIcon icon={APPICONS.exitAction}></IonIcon>
      </IonButton>
    </>
  );
};
export default CloseDocumentButton;
