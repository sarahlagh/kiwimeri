import { CollectionItemVersion } from '@/collection/collection';
import { dateToStr } from '@/common/date-utils';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
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
import { useToastContext } from '../context/ToastContext';
import { GET_VERSIONED_ROUTE } from '../routes';

type ManageHistoryButtonProps = {
  id: string;
  onRestore: (id: string) => void;
};

type ManageHistoryModalProps = {
  id: string;
  dismiss: (version?: string, role?: 'goToVersion' | 'restore') => void;
  docVersion?: string;
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
  lastPreview,
  isActive
}: {
  version: CollectionItemVersion;
  isActive: boolean;
  lastPreview?: string;
}) => {
  const style = isActive ? { fontWeight: 'bold' } : {};
  if (lastPreview) {
    const diff = diffChars(lastPreview, version.preview);
    return (
      <IonLabel style={style}>
        {dateToStr('relative', version.snapshotJson.updated)}
        <p>
          {diff.map((part, idx) => (
            <DiffFragment part={part} key={idx} />
          ))}
        </p>
      </IonLabel>
    );
  }
  return (
    <IonLabel style={style}>
      {dateToStr('relative', version.snapshotJson.updated)}
      <p>{version.preview.substring(0, 200)}</p>
    </IonLabel>
  );
};

const ManageHistoryModal = ({
  id,
  dismiss,
  docVersion
}: ManageHistoryModalProps) => {
  const { t } = useLingui();
  const [alert] = useIonAlert();
  const { setToast } = useToastContext();
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
          {docHistory
            .filter(version => version.op !== 'deleted')
            .map((version, idx) => (
              <IonItem
                key={version.id}
                button
                onClick={() => dismiss(version.id, 'goToVersion')}
              >
                <VersionPreview
                  version={version}
                  isActive={version.id === docVersion}
                  lastPreview={
                    idx < docHistory.length - 1
                      ? docHistory[idx + 1].preview
                      : undefined
                  }
                />

                {version.rank !== 0 && (
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
                              historyService.restoreDocumentVersion(
                                id,
                                version.id!
                              );
                              setToast(t`Success!`, 'success');
                              dismiss(version.id, 'restore');
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

const ManageHistoryButton = ({ id, onRestore }: ManageHistoryButtonProps) => {
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
  const type = collectionService.getItemType(id);

  return (
    <IonButton
      onClick={() => {
        present({
          onDidDismiss: event => {
            if (event.detail.role === 'goToVersion' && event.detail.data) {
              const version = event.detail.data as string;
              history.push(
                GET_VERSIONED_ROUTE(
                  type,
                  version,
                  id,
                  searchParams.folder || notebook,
                  undefined,
                  undefined,
                  query
                )
              );
            } else if (event.detail.role === 'restore') {
              onRestore(id);
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
