import { HistorizedCollectionItem } from '@/collection/collection';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
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
import { diffChars } from 'diff';
import { dateToStr } from '../utils';

type ManageHistoryButtonProps = {
  id: string;
};

type ManageHistoryModalProps = {
  id: string;
  dismiss: () => void;
};

// TODO diff can't show style differences
const VersionPreview = ({
  version,
  nextPreview
}: {
  version: HistorizedCollectionItem;
  nextPreview: string;
}) => {
  const versionData = JSON.parse(version.versionData);
  const diff = diffChars(version.versionPreview, nextPreview);
  const spans: { key: number; val: string; color?: string }[] = [];
  diff.forEach((part, idx) => {
    const color = part.added
      ? 'var(--diff-added-color)'
      : part.removed
        ? 'var(--diff-removed-color)'
        : undefined;
    let val = part.value;
    if (val.length > 45) {
      val = val.substring(0, 20) + '(...)' + val.substring(val.length - 20);
    }
    spans.push({ key: idx, val, color });
  });
  return (
    <>
      <IonLabel>
        {dateToStr('relative', versionData.updated)}

        <p>
          {spans.map(span => (
            <span key={span.key} style={{ color: span.color }}>
              {span.val}
            </span>
          ))}
        </p>
      </IonLabel>
    </>
  );
};

const ManageHistoryModal = ({ id, dismiss }: ManageHistoryModalProps) => {
  const docHistory = historyService.getVersions(id);
  const docPreview = searchAncestryService.getItemPreview(id);

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
            <IonItem key={version.id}>
              <VersionPreview
                version={version}
                nextPreview={
                  idx === 0 ? docPreview : docHistory[idx - 1].versionPreview
                }
              />
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
