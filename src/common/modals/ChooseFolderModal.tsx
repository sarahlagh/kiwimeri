import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { add, albumsOutline, chevronBack, close, home } from 'ionicons/icons';
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
          disabled={folderId === ROOT_FOLDER}
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
          <Trans>Rename</Trans>
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
  currentParent: string;
  onClose: (parentId?: string) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ChooseFolderModal = ({
  currentParent,
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
        actionDisabled={node => node.id === currentParent}
        onSelectedNode={node => {
          setFolder(node.id);
          setSelected(null);
          setRenaming(null);
        }}
        onClickActions={(e, node) => {
          setSelected(selected?.id === node.id ? null : node);
          setRenaming(null);
        }}
        onItemRenamed={newTitle => {
          documentsService.setDocumentNodeTitle(renaming!, newTitle);
          setRenaming(null);
        }}
        actionsIcon={albumsOutline}
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
