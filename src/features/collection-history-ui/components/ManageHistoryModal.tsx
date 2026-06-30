import { useToastContext } from '@/app/context/ToastContext';
import { APPICONS } from '@/constants';
import { historyService } from '@/domain/history/history.service';
import { CollectionItemVersion } from '@/domain/history/queries/fetchVersionsQuery';
import LoadingInline from '@/shared/components/LoadingInline';
import { dateToStr } from '@/shared/misc/date-utils';
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
  useIonAlert
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { ChangeObject, diffChars } from 'diff';
import { useState } from 'react';

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
  const [diff, setDiff] = useState<ChangeObject<string>[] | null>(null);
  const style = isActive ? { fontWeight: 'bold' } : {};
  if (lastPreview) {
    setTimeout(() => {
      diffChars(lastPreview, version.preview, {
        callback: result => {
          setDiff(result);
        }
      });
    });
    if (diff === null) return <LoadingInline />;
    return (
      <IonLabel style={style}>
        {dateToStr('relative', version.snapshotJson.updatedAt)}
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
      {dateToStr('relative', version.snapshotJson.updatedAt)}
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
  const docHistory = historyService.getVersions(id, 15);
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

                {idx !== 0 && (
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

export default ManageHistoryModal;
