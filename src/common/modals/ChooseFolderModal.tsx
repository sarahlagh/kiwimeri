import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import {
  add,
  chevronBack,
  close,
  createOutline,
  home,
  openOutline
} from 'ionicons/icons';
import React, { useEffect, useState } from 'react';
import { ROOT_FOLDER } from '../../constants';
import documentsService from '../../db/documents.service';
import DocumentNodeList from '../../documents/components/DocumentNodeList';
import { DocumentNodeResult, DocumentNodeType } from '../../documents/document';

const FAKE_ROOT = 'root'; // to allow choosing root in the modal

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
      <IonButtons slot="start">
        {/* go to home button */}
        <IonButton
          disabled={folderId === FAKE_ROOT}
          onClick={() => {
            onClick('gointo', FAKE_ROOT);
          }}
        >
          <IonIcon icon={home}></IonIcon>
        </IonButton>
        {/* go to current folder parent */}
        <IonButton
          disabled={folderId === ROOT_FOLDER || folderId === FAKE_ROOT}
          onClick={() => {
            const parentId = documentsService.getDocumentNodeParent(folderId);
            onClick('gointo', parentId);
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
          <IonIcon aria-hidden="true" icon={add} />
        </IonButton>
        <IonButton
          disabled={selected === ROOT_FOLDER || !selected}
          onClick={() => {
            onClick('rename', selected!);
          }}
        >
          <IonIcon icon={createOutline}></IonIcon>
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
  const { t } = useLingui();
  const [folder, setFolder] = useState<string>(currentParent);
  const [selected, setSelected] = useState<DocumentNodeResult | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const root = {
    id: ROOT_FOLDER,
    parent: '',
    title: t`Home`,
    type: DocumentNodeType.folder,
    created: Date.now(),
    updated: Date.now(),
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
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <DocumentNodeList
        itemId="modal-item"
        documents={nodes}
        selected={selected?.id}
        itemRenaming={node => node.id !== ROOT_FOLDER && node.id === renaming}
        itemDisabled={node =>
          currentType === DocumentNodeType.folder ? node.id === id : false
        }
        onSelectedNode={node => {
          if (node.id !== currentParent) {
            setSelected(selected?.id === node.id ? null : node);
            setRenaming(null);
          }
        }}
        onClickActions={(e, node) => {
          setFolder(node.id);
          setSelected(null);
          setRenaming(null);
        }}
        onItemRenamed={newTitle => {
          documentsService.setDocumentNodeTitle(renaming!, newTitle);
          setRenaming(null);
        }}
        actionsIcon={openOutline}
        footer={
          <Toolbar
            selected={selected?.id}
            folderId={folder}
            onClick={(role, newFolderId) => {
              if (role === 'gointo') {
                setFolder(newFolderId);
                setSelected(null);
                setRenaming(null);
              }
              if (role === 'rename') {
                setRenaming(renaming ? null : newFolderId);
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
