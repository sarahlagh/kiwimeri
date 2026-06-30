import { GET_VERSIONED_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import notebooksService from '@/db/notebooks.service';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { lazy } from 'react';
import { useHistory, useLocation } from 'react-router';

type ManageHistoryButtonProps = {
  id: string;
  afterRestore?: (id: string) => void;
};

const ManageHistoryModal = lazy(() => import('./ManageHistoryModal'));

const ManageHistoryButton = ({
  id,
  afterRestore
}: ManageHistoryButtonProps) => {
  const history = useHistory();
  const notebook = notebooksService.useCurrentNotebook();
  const location = useLocation(); // warning: location throws error if button in popover
  const searchParams = getSearchParams(location.search);
  const query = searchParams.query;
  const docVersion = searchParams.docVersion;
  const [present, dismiss] = useIonModal(ManageHistoryModal, {
    id,
    dismiss: (data?: string, role?: string) => dismiss(data, role),
    docVersion
  });
  return (
    <IonButton
      onClick={() => {
        present({
          cssClass: 'fixed-width-modal',
          onDidDismiss: event => {
            if (event.detail.role === 'goToVersion' && event.detail.data) {
              const version = event.detail.data as string;
              history.push(
                GET_VERSIONED_ROUTE(
                  version,
                  id,
                  searchParams.folder || notebook,
                  query
                )
              );
            } else if (event.detail.role === 'restore' && afterRestore) {
              afterRestore(id);
            }
          }
        });
      }}
    >
      <IonIcon icon={APPICONS.history}></IonIcon>
    </IonButton>
  );
};

export default ManageHistoryButton;
