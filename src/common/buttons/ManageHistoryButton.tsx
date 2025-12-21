import { HistorizedCollectionItem } from '@/collection/collection';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  useIonModal
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import { dateToStr } from '../utils';

type ManageHistoryButtonProps = {
  id: string;
};

type ManageHistoryModalProps = {
  id: string;
  dismiss: () => void;
};

const VersionPreview = ({ version }: { version: HistorizedCollectionItem }) => {
  // TODO display diff with next version only?
  return (
    <>
      <IonLabel>
        {dateToStr('relative', version.created)}
        <p>{version.versionPreview}</p>
      </IonLabel>
    </>
  );
};

const ManageHistoryModal = ({ id, dismiss }: ManageHistoryModalProps) => {
  const docHistory = historyService.getVersions(id);

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            <Trans>Document History</Trans>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => dismiss()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList
          style={{
            maxHeight: 'calc(100% - 64px)',
            overflowY: 'auto',
            padding: '0 8px'
          }}
        >
          {docHistory.map(version => (
            <IonItem key={version.id}>
              <VersionPreview version={version} />
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </>
  );
};

const ManageHistoryButton = ({ id }: ManageHistoryButtonProps) => {
  const [present, dismiss] = useIonModal(ManageHistoryModal, {
    id,
    dismiss: () => dismiss()
  });

  return (
    <IonButton
      onClick={() => {
        present();
      }}
    >
      <IonIcon icon={APPICONS.history}></IonIcon>
    </IonButton>
  );
};

export default ManageHistoryButton;
