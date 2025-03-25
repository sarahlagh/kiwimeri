import {
  add,
  albums,
  chevronBack,
  documentTextOutline,
  folderSharp
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToolbar
} from '@ionic/react';

import { useEffect } from 'react';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeType } from '../document';

interface AppPage {
  key: string;
  url: string;
  mdIcon: string;
  title: string;
}

interface DocumentListProps {
  parent: string;
}

export const DocumentList = ({ parent: folder }: DocumentListProps) => {
  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
  }, [folder]);

  const documents: AppPage[] = documentsService.useDocumentNodes(folder).map(
    document =>
      ({
        key: document.id,
        title: document.title,
        url:
          document.type === DocumentNodeType.document
            ? `/collection/${document.parent}/document/${document.id}`
            : `/collection/${document.id}`,
        mdIcon:
          document.type === DocumentNodeType.document
            ? documentTextOutline
            : folderSharp
      }) as AppPage
  );

  const current = documentsService.useDocument(folder);
  useEffect(() => {
    if (location.pathname === `/collection/${folder}`) {
      userSettingsService.setCurrentFolder(folder);
    }
  }, [folder, current]);

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
        <IonButtons slot="start">
          <IonButton
            disabled={folder === ROOT_FOLDER}
            onClick={() => {
              history.push(`/collection/${current.parent}`);
            }}
          >
            <IonIcon icon={chevronBack}></IonIcon>
          </IonButton>
        </IonButtons>

        <IonButtons slot="end">
          <IonButton
            onClick={() => {
              documentsService.addFolder(folder);
            }}
          >
            <IonIcon aria-hidden="true" ios={albums} md={albums} />
          </IonButton>
          <IonButton
            onClick={() => {
              documentsService.addDocument(folder);
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
