import {
  add,
  albums,
  chevronBack,
  documentTextOutline,
  ellipsisVertical,
  folderSharp,
  home
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { useSearchParams } from '../../common/hooks/useSearchParams';
import { GET_DOCUMENT_ROUTE, GET_FOLDER_ROUTE } from '../../common/routes';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeResult, DocumentNodeType } from '../document';
import DocumentActionsToolbar from './DocumentActionsToolbar';
import FolderActionsToolbar from './FolderActionsToolbar';

interface DocumentListProps {
  parent: string;
}

const DocumentListNodeItem = ({
  document,
  onClick
}: {
  document: DocumentNodeResult;
  onClick: (e: Event) => void;
}) => {
  const searchParams = useSearchParams();
  const url =
    document.type === DocumentNodeType.document
      ? GET_DOCUMENT_ROUTE(document.parent, document.id)
      : GET_FOLDER_ROUTE(document.id);
  const icon =
    document.type === DocumentNodeType.document
      ? documentTextOutline
      : folderSharp;
  return (
    <IonItem
      key={document.id}
      color={searchParams?.document === document.id ? 'primary' : ''}
      routerLink={url}
      routerDirection="none"
      lines="none"
      detail={false}
    >
      <IonIcon aria-hidden="true" slot="start" icon={icon} />
      <IonButton
        slot="end"
        fill="clear"
        color="medium"
        id="click-trigger"
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
          onClick(e.nativeEvent);
        }}
      >
        <IonIcon aria-hidden="true" icon={ellipsisVertical} />
      </IonButton>
      <IonLabel>{document.title}</IonLabel>
    </IonItem>
  );
};

const DocumentListToolbar = ({
  folderId,
  parentId
}: {
  folderId: string;
  parentId: string;
}) => {
  const history = useHistory();
  return (
    <IonToolbar>
      <IonButtons slot="start">
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_FOLDER_ROUTE(ROOT_FOLDER));
          }}
        >
          <IonIcon icon={home}></IonIcon>
        </IonButton>
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_FOLDER_ROUTE(parentId));
          }}
        >
          <IonIcon icon={chevronBack}></IonIcon>
        </IonButton>
      </IonButtons>

      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            documentsService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" ios={albums} md={albums} />
        </IonButton>
        <IonButton
          onClick={() => {
            documentsService.addDocument(folderId);
          }}
        >
          <IonIcon aria-hidden="true" ios={add} md={add} />
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

export const DocumentList = ({ parent: folder }: DocumentListProps) => {
  const parentFolder = documentsService.getDocumentNodeParent(folder);
  const documents: DocumentNodeResult[] =
    documentsService.useDocumentNodes(folder);

  const [selectedNode, setSelectedNode] = useState<DocumentNodeResult | null>(
    null
  );

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
    userSettingsService.setCurrentFolder(folder);
  }, [folder]);

  const [present, dismiss] = useIonPopover(() => (
    <>
      {selectedNode?.type === DocumentNodeType.folder && (
        <FolderActionsToolbar
          id={selectedNode.id}
          title={selectedNode.title}
          onClose={() => {
            dismiss();
            setSelectedNode(null);
          }}
        />
      )}
      {selectedNode?.type === DocumentNodeType.document && (
        <DocumentActionsToolbar
          id={selectedNode.id}
          title={selectedNode.title}
          onClose={() => {
            dismiss();
            setSelectedNode(null);
          }}
        />
      )}
    </>
  ));

  return (
    <>
      <IonContent>
        <IonList id="document-explorer-menu-list">
          {documents.map(document => {
            return (
              <DocumentListNodeItem
                key={document.id}
                document={document}
                onClick={event => {
                  setSelectedNode(document);
                  present({
                    event,
                    alignment: 'end'
                  });
                }}
              />
            );
          })}
        </IonList>
      </IonContent>

      <IonFooter>
        <DocumentListToolbar folderId={folder} parentId={parentFolder} />
      </IonFooter>
    </>
  );
};

export default DocumentList;
