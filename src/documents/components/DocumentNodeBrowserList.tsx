import {
  add,
  albums,
  chevronBack,
  ellipsisVertical,
  folderSharp,
  home
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { useSearchParams } from '../../common/hooks/useSearchParams';
import { GET_NODE_ROUTE } from '../../common/routes';
import platformService from '../../common/services/platform.service';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import userSettingsService from '../../db/user-settings.service';
import { DocumentNodeResult, DocumentNodeType } from '../document';
import DocumentActionsToolbar from './DocumentActionsToolbar';
import DocumentNodeList from './DocumentNodeList';
import FolderActionsToolbar from './FolderActionsToolbar';

interface DocumentNodeBrowserListProps {
  parent: string;
}

const DocumentNodeBrowserListToolbar = ({
  folderId,
  parentId,
  openedDocument
}: {
  folderId: string;
  parentId: string;
  openedDocument: string | undefined;
}) => {
  const history = useHistory();
  const openedDocumentFolder = openedDocument
    ? documentsService.getDocumentNodeParent(openedDocument)
    : null;
  return (
    <IonToolbar>
      <IonButtons slot="start">
        {/* go to home button */}
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_NODE_ROUTE(ROOT_FOLDER, openedDocument));
          }}
        >
          <IonIcon icon={home}></IonIcon>
        </IonButton>
        {/* go to current opened document parent folder */}
        {platformService.isWideEnough() && (
          <IonButton
            disabled={folderId === openedDocumentFolder}
            onClick={() => {
              if (openedDocumentFolder) {
                history.push(
                  GET_NODE_ROUTE(openedDocumentFolder, openedDocument)
                );
              }
            }}
          >
            <IonIcon icon={folderSharp}></IonIcon>
          </IonButton>
        )}
        {/* go to current folder parent */}
        <IonButton
          disabled={folderId === ROOT_FOLDER}
          onClick={() => {
            history.push(GET_NODE_ROUTE(parentId, openedDocument));
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

export const DocumentNodeBrowserList = ({
  parent: folder
}: DocumentNodeBrowserListProps) => {
  const searchParams = useSearchParams();
  const openedDocument = searchParams?.document;
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
    <DocumentNodeList
      documents={documents}
      selected={openedDocument}
      getUrl={document =>
        document.type === DocumentNodeType.document
          ? GET_NODE_ROUTE(document.parent, document.id)
          : GET_NODE_ROUTE(document.id, openedDocument)
      }
      actionsIcon={ellipsisVertical}
      onClickActions={(event, node) => {
        setSelectedNode(node);
        present({
          event,
          alignment: 'end'
        });
      }}
      footer={
        <DocumentNodeBrowserListToolbar
          folderId={folder}
          parentId={parentFolder}
          openedDocument={openedDocument}
        />
      }
    />
  );
};

export default DocumentNodeBrowserList;
