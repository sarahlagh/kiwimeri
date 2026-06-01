import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import { APPICONS } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { hammerOutline } from 'ionicons/icons';
import { useState } from 'react';
import { pageMigrationService } from '../page-migration.service';
import fetchDocsWithPagesQuery from '../queries/fetchDocsWithPagesQuery';
import ExplodeDocModal from './ExplodeDocModal';

type PagesMigrationModalProps = {
  dismiss: () => void;
};

const PagesMigrationModal = ({ dismiss }: PagesMigrationModalProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const items = useQueryResults(fetchDocsWithPagesQuery);

  if (items.length === 0) {
    return (
      <>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Everything OK.</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          No more documents to migrate. Clicking on the button below will
          terminate migration and allow syncing.
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonButtons slot="end">
              <IonButton
                onClick={() => {
                  pageMigrationService.stop();
                  dismiss();
                }}
              >
                Terminate
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonFooter>
      </>
    );
  }

  if (selected) {
    return (
      <ExplodeDocModal
        showContext={true}
        id={selected}
        close={() => dismiss()}
        dismiss={() => setSelected(null)}
      />
    );
  }
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Those documents must be migrated.</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {items.map(item => {
            return (
              <IonItem
                key={item.id}
                button
                onClick={() => {
                  dismiss();
                }}
                routerLink={GET_DOCUMENT_ROUTE(item.docId, item.id)}
              >
                <IonIcon
                  icon={item.created ? APPICONS.document : APPICONS.warning}
                  slot="start"
                />
                {item.title}
                <IonButton
                  slot="end"
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelected(item.id);
                  }}
                >
                  <IonIcon icon={hammerOutline} />
                </IonButton>
              </IonItem>
            );
          })}
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => dismiss()}>Leave</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </>
  );
};

export default PagesMigrationModal;
