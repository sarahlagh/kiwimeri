import { GET_DOCUMENT_ROUTE } from '@/common/routes';
import { APPICONS, DEFAULT_NOTEBOOK_ID } from '@/constants';
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
import fetchDocsWithPagesQuery from '../queries/fetchDocsWithPagesQuery';
import ExplodeDocModal from './ExplodeDocModal';

type PagesMigrationModalProps = {
  dismiss: () => void;
};

const PagesMigrationModal = ({ dismiss }: PagesMigrationModalProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const items = useQueryResults(fetchDocsWithPagesQuery);

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
                routerLink={GET_DOCUMENT_ROUTE(
                  item.folderOrNotebookId || DEFAULT_NOTEBOOK_ID,
                  item.docId
                )}
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
                    setSelected(item.docId);
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
