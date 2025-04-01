import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React, { useEffect, useState } from 'react';
import { getGlobalTrans } from '../../config';
import { APPICONS, FAKE_ROOT, ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentNodeBreadcrumb from '../../documents/components/DocumentNodeBreadcrumb';
import DocumentNodeList from '../../documents/components/DocumentNodeList';
import { DocumentNodeResult, DocumentNodeType } from '../../documents/document';

const Toolbar = ({
  selected,
  folderId,
  onClick
}: {
  selected?: string;
  folderId: string;
  onClick: (role: 'gointo' | 'rename' | 'choose', newFolderId: string) => void;
}) => {
  return (
    <IonToolbar>
      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            documentsService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addNodeGeneric} />
        </IonButton>
        <IonButton
          disabled={selected === ROOT_FOLDER || !selected}
          onClick={() => {
            onClick('rename', selected!);
          }}
        >
          <IonIcon icon={APPICONS.renameAction}></IonIcon>
        </IonButton>
        <IonButton
          disabled={!selected}
          onClick={() => {
            onClick('choose', selected!);
          }}
        >
          <Trans>Choose</Trans>
        </IonButton>
      </IonButtons>
    </IonToolbar>
  );
};

type ChooseFolderModalProps = {
  id: string;
  currentParent: string;
  currentType: string;
  onClose: (parentId?: string) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ChooseFolderModal = ({
  id,
  currentParent,
  currentType,
  onClose
}: ChooseFolderModalProps) => {
  const [folder, setFolder] = useState<string>(currentParent);
  const [selected, setSelected] = useState<DocumentNodeResult | null>(null);
  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );

  const root = {
    id: ROOT_FOLDER,
    parent: '',
    title: getGlobalTrans().homeTitle,
    type: DocumentNodeType.folder,
    created: 0,
    updated: 0,
    deleted: false
  };

  useEffect(() => {
    documentsService.generateFetchAllDocumentNodesQuery(folder);
  }, [folder]);

  const documents: DocumentNodeResult[] = documentsService
    .useDocumentNodes(folder)
    .filter(node => node.type === DocumentNodeType.folder);

  const nodes = folder === FAKE_ROOT ? [root] : documents;
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {/* TODO allow bigger title even for android*/}
            <Trans>Choose a new folder</Trans>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => onClose()}>
              <IonIcon icon={APPICONS.closeAction} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <DocumentNodeList
        header={
          <DocumentNodeBreadcrumb
            folder={folder}
            onClick={node => {
              setFolder(node);
              setSelected(null);
              setItemRenaming(undefined);
            }}
          />
        }
        documents={nodes}
        selected={selected?.id}
        itemProps={node =>
          node.id === currentParent
            ? { style: { fontWeight: 'bold' } }
            : undefined
        }
        itemRenaming={itemRenaming}
        itemDisabled={node =>
          currentType === DocumentNodeType.folder ? node.id === id : false
        }
        onSelectedNode={node => {
          if (node.id !== currentParent) {
            setSelected(selected?.id === node.id ? null : node);
            setItemRenaming(undefined);
          }
        }}
        onClickActions={(e, node) => {
          setFolder(node.id);
          setSelected(null);
          setItemRenaming(undefined);
        }}
        onRenamingDone={() => {
          setItemRenaming(undefined);
        }}
        actionsIcon={APPICONS.goIntoAction}
        footer={
          <Toolbar
            selected={selected?.id}
            folderId={folder}
            onClick={(role, newFolderId) => {
              if (role === 'gointo') {
                setFolder(newFolderId);
                setSelected(null);
                setItemRenaming(undefined);
              }
              if (role === 'rename') {
                setItemRenaming(itemRenaming ? undefined : newFolderId);
              }
              if (role === 'choose') {
                onClose(newFolderId);
              }
            }}
          ></Toolbar>
        }
      />
    </>
  );
};
export default ChooseFolderModal;
