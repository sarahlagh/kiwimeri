import { APPICONS, ROOT_COLLECTION } from '@/constants';
import { useQueryResults } from '@/core/db/queries-helper';
import {
  CollectionItemResult,
  CollectionItemType
} from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import notebooksService from '@/domain/collection/notebooks.service';
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
import { CollectionItemBreadcrumb, CollectionItemList } from '..';
import useFetchBrowsableItemsQuery from '../hooks/useFetchBrowsableItemsQuery';
import useFetchBrowsableItemsQueryParamsState from '../hooks/useFetchBrowsableItemsQueryParamsState';

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
  const notebook = notebooksService.getCurrentNotebook();
  return (
    <IonToolbar>
      <IonButtons slot="start">
        {/* go to home button */}
        <IonButton
          disabled={folderId === ROOT_COLLECTION}
          onClick={() => {
            onClick('gotonotebooks', ROOT_COLLECTION);
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
          disabled={selected === notebook || !selected}
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

const restrictTypes = [CollectionItemType.folder, CollectionItemType.notebook];

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
  const [selected, setSelected] = useState<CollectionItemResult | null>(null);
  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );

  const query = useFetchBrowsableItemsQuery(
    'ChooseFolderModal',
    currentParent,
    restrictTypes
  );
  const [parent, setParent] = useFetchBrowsableItemsQueryParamsState(
    query,
    restrictTypes
  );
  const finalItems = useQueryResults(query);

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
            folder={parent}
            onClick={itemId => {
              setParent(itemId);
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
          setParent(item.id);
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
            folderId={parent}
            onClick={(role, newFolderId) => {
              if (role === 'gotonotebooks') {
                setParent(newFolderId);
                setSelected(null);
                setItemRenaming(undefined);
              }
              if (role === 'rename') {
                setItemRenaming(itemRenaming ? undefined : newFolderId);
              }
              if (role === 'choose') {
                onClose(newFolderId, newFolderId);
              }
            }}
          ></Toolbar>
        }
      />
    </>
  );
};
export default ChooseFolderModal;
