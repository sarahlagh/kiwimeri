import { add, albums, folderSharp } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToolbar
} from '@ionic/react';

import documentsService from '../../db/documents.service';

interface AppPage {
  key: string;
  url: string;
  mdIcon: string;
  title: string;
}

export const DocumentList = () => {
  const documents: AppPage[] = documentsService.useDocuments().map(
    document =>
      ({
        key: document.id,
        title: document.title,
        url: `/collection/document/${document.id}`,
        mdIcon: folderSharp
      }) as AppPage
  );

  const location = useLocation();
  return (
    <>
      <IonList
        id="document-explorer-menu-list"
        style={{ height: 'calc(100% - 56px)', overflowY: 'auto' }}
      >
        {documents.map(document => {
          return (
            <IonItem
              key={document.key}
              color={location.pathname === document.url ? 'primary' : ''}
              routerLink={document.url}
              routerDirection="none"
              lines="none"
              detail={false}
            >
              <IonIcon
                aria-hidden="true"
                slot="start"
                ios={document.mdIcon}
                md={document.mdIcon}
              />
              <IonLabel>{document.title}</IonLabel>
            </IonItem>
          );
        })}
      </IonList>
      <IonToolbar>
        <IonButtons slot="end">
          <IonButton
            onClick={() => {
              console.debug('placeholder for add folder');
            }}
          >
            <IonIcon aria-hidden="true" ios={albums} md={albums} />
          </IonButton>
          <IonButton
            onClick={() => {
              documentsService.addDocument();
            }}
          >
            <IonIcon aria-hidden="true" ios={add} md={add} />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </>
  );
};

export default DocumentList;
