import {
  HistorizedCollectionItem,
  HistorizedCollectionItemData
} from '@/collection/collection';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
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
  useIonAlert,
  useIonModal
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChangeObject, diffChars } from 'diff';
import { useHistory, useLocation } from 'react-router';
import { GET_VERSIONED_ROUTE } from '../routes';
import { dateToStr, getSearchParams } from '../utils';

type ManageHistoryButtonProps = {
  id: string;
};

type ManageHistoryModalProps = {
  id: string;
  dismiss: (version?: string) => void;
};

// TODO diff can't show style differences

const DiffFragment = ({ part }: { part: ChangeObject<string> }) => {
  const color = part.added
    ? 'var(--diff-added-color)'
    : part.removed
      ? 'var(--diff-removed-color)'
      : undefined;
  let val = part.value;
  if (val.length > 45) {
    val = val.substring(0, 20) + '(...)' + val.substring(val.length - 20);
  }
  return <span style={{ color }}>{val}</span>;
};

const VersionPreview = ({
  version,
  lastPreview
}: {
  version: HistorizedCollectionItem;
  lastPreview?: string;
}) => {
  const versionData = JSON.parse(
    version.versionData
  ) as HistorizedCollectionItemData;

  if (lastPreview) {
    const diff = diffChars(lastPreview, version.versionPreview);
    return (
      <IonLabel>
        {dateToStr('relative', versionData.updated)}
        <p>
          {diff.map((part, idx) => (
            <DiffFragment part={part} key={idx} />
          ))}
        </p>
      </IonLabel>
    );
  }
  return (
    <IonLabel>
      {dateToStr('relative', versionData.updated)}
      <p>{version.versionPreview.substring(0, 200)}</p>
    </IonLabel>
  );
};

const ManageHistoryModal = ({ id, dismiss }: ManageHistoryModalProps) => {
  const { t } = useLingui();
  const [alert] = useIonAlert();
  // const current =
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
          {docHistory.map((version, idx) => (
            <IonItem
              key={version.id}
              button
              onClick={() => dismiss(version.id)}
            >
              <VersionPreview
                version={version}
                lastPreview={
                  idx < docHistory.length - 1
                    ? docHistory[idx + 1].versionPreview
                    : undefined
                }
              />

              {!historyService.isCurrentVersion(version.docId, version.id!) && (
                <IonButton
                  slot="end"
                  fill="clear"
                  onClick={async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert({
                      header: t`Restore Version`,
                      message: t`Are you sure?`,
                      buttons: [
                        {
                          text: t`Cancel`,
                          role: 'cancel'
                        },
                        {
                          text: t`Confirm`,
                          role: 'destructive',
                          handler: () => {
                            historyService.restoreVersion(id, version.id!);
                          }
                        }
                      ]
                    });
                  }}
                >
                  <IonIcon icon={APPICONS.restore}></IonIcon>
                </IonButton>
              )}
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </>
  );
};

const ManageHistoryButton = ({ id }: ManageHistoryButtonProps) => {
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const [present, dismiss] = useIonModal(ManageHistoryModal, {
    id,
    dismiss: (version?: string) => dismiss(version)
  });
  const type = collectionService.getItemType(id);
  const query = searchParams.query;

  return (
    <IonButton
      onClick={() => {
        present({
          onDidDismiss: event => {
            if (event.detail.data !== undefined) {
              const version = event.detail.data as string;
              history.push(GET_VERSIONED_ROUTE(id, type, version, query));
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
