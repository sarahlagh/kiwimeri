import { useRouteContext, useSearchQuery } from '@/app/context/RouteContext';
import { GET_VERSIONED_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import LazyModalTemplate from '@/shared/modals/LazyModalTemplate';
import { IonButton, IonIcon, useIonModal } from '@ionic/react';
import { lazy } from 'react';
import { useNavigate } from 'react-router';

type ManageHistoryButtonProps = {
  id: string;
  afterRestore?: (id: string) => void;
};

export type ManageHistoryModalProps = {
  id: string;
  dismiss: (version?: string, role?: 'goToVersion' | 'restore') => void;
  docVersion?: string;
};

const ManageHistoryModal = lazy(() => import('./ManageHistoryModal'));
function ManageHistoryModalWrapped(props: ManageHistoryModalProps) {
  return (
    <LazyModalTemplate>
      <ManageHistoryModal {...props} />
    </LazyModalTemplate>
  );
}

const ManageHistoryButton = ({
  id,
  afterRestore
}: ManageHistoryButtonProps) => {
  const navigate = useNavigate();
  const routeCtx = useRouteContext();
  const query = useSearchQuery();
  const [present, dismiss] = useIonModal(ManageHistoryModalWrapped, {
    id,
    dismiss: (data?: string, role?: string) => dismiss(data, role),
    docVersion: routeCtx.docVersion
  });
  return (
    <IonButton
      onClick={() => {
        present({
          cssClass: 'fixed-width-modal',
          onDidDismiss: event => {
            if (event.detail.role === 'goToVersion' && event.detail.data) {
              const version = event.detail.data as string;
              navigate(
                GET_VERSIONED_ROUTE(version, id, routeCtx.folder, query)
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
