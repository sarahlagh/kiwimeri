import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import CollectionItemBreadcrumb from '@/collection/components/CollectionItemBreadcrumb';
import CollectionItemList from '@/collection/components/CollectionItemList';
import { APPICONS, FAKE_ROOT, ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans } from '@lingui/react/macro';
import React, { useState } from 'react';

const Toolbar = ({
  selected,
  folderId,
  onClick
}: {
  selected?: string;
  folderId: string;
  onClick: (
    role: 'gotonotebooks' | 'rename' | 'choose',
    newFolderId: string
  ) => void;
}) => {
  return (
    <IonToolbar>
      <IonButtons slot="start">
        {/* go to home button */}
        <IonButton
          disabled={folderId === FAKE_ROOT}
          onClick={() => {
            onClick('gotonotebooks', FAKE_ROOT);
          }}
        >
          <IonIcon icon={APPICONS.library}></IonIcon>
        </IonButton>
      </IonButtons>
      <IonButtons slot="end">
        <IonButton
          onClick={() => {
            collectionService.addFolder(folderId);
          }}
        >
          <IonIcon aria-hidden="true" icon={APPICONS.addGeneric} />
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
  onClose: (parentId?: string, notebookId?: string) => void;
} & React.HTMLAttributes<HTMLIonModalElement>;

const ChooseFolderModal = ({
  id,
  currentParent,
  currentType,
  onClose
}: ChooseFolderModalProps) => {
  const currentNotebook = notebooksService.getCurrentNotebook();
  const [folder, setFolder] = useState<string>(currentParent);
  const [notebook, setNotebook] = useState<string>(currentNotebook);
  const [selected, setSelected] = useState<CollectionItemResult | null>(null);
  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );

  const notebooks = notebooksService.getNotebooks();

  const items: CollectionItemResult[] = collectionService
    .useCollectionItems(folder, notebook)
    .filter(item => item.type === CollectionItemType.folder);

  const finalItems = folder === FAKE_ROOT ? [...notebooks] : items;
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
      <CollectionItemList
        header={
          <CollectionItemBreadcrumb
            folder={folder}
            onClick={item => {
              setFolder(item);
              setSelected(null);
              setItemRenaming(undefined);
            }}
          />
        }
        items={finalItems}
        selected={selected?.id}
        itemProps={item =>
          item.id === currentParent
            ? { style: { fontWeight: 'bold' } }
            : undefined
        }
        itemRenaming={itemRenaming}
        itemDisabled={item =>
          currentType === CollectionItemType.folder ? item.id === id : false
        }
        onSelectedItem={item => {
          if (item.id !== currentParent) {
            setSelected(selected?.id === item.id ? null : item);
            setItemRenaming(undefined);
          }
        }}
        onClickActions={(e, item) => {
          // this is the 'go into' click
          if (item.type === CollectionItemType.folder) {
            setFolder(item.id);
          } else if (item.type === CollectionItemType.notebook) {
            setNotebook(item.id);
            setFolder(ROOT_FOLDER);
          }
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
              console.debug('Toolbar onClick', role, newFolderId);
              if (role === 'gotonotebooks') {
                setFolder(newFolderId);
                setSelected(null);
                setItemRenaming(undefined);
              }
              if (role === 'rename') {
                setItemRenaming(itemRenaming ? undefined : newFolderId);
              }
              if (role === 'choose') {
                if (notebooks.find(n => n.id === newFolderId)) {
                  onClose(ROOT_FOLDER, newFolderId);
                } else {
                  onClose(newFolderId, notebook);
                }
              }
            }}
          ></Toolbar>
        }
      />
    </>
  );
};
export default ChooseFolderModal;
