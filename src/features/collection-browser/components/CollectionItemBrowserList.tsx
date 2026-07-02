import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import { GET_ITEM_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { CollectionItemType } from '@/domain/collection/collection';
import collectionService from '@/domain/collection/collection.service';
import { ExportItemsButton, ImportItemsButton } from '@/features/import-export';
import { getSearchParams } from '@/shared/utils';

import { settingsService } from '@/domain/collection/collection-settings.service';
import notebooksService from '@/domain/collection/notebooks.service';

import { ActionsFromBrowserToolbar } from '@/features/collection-item-actions';
import { useHasLocalConflicts } from '@/features/synchronization-ui';
import { useLingui } from '@lingui/react/macro';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { BrowsableItemResult, fromCollectionItemSort } from '../browsable-item';
import useCollectionItemBrowserListResults, {
  BrowserQueryMode,
  browserModes
} from '../hooks/useCollectionItemBrowserListResults';
import useFolderEffectiveSort from '../hooks/useFolderEffectiveSort';
import useNotebookLastBrowserMode from '../hooks/useNotebookLastBrowserMode';
import CollectionItemBreadcrumb from './CollectionItemBreadcrumb';
import CollectionItemList from './CollectionItemList';
import SortFilterInlineList from './SortFilterInlineList';

interface CollectionItemBrowserListProps {
  parent: string;
}

const CollectionItemBrowserListToolbar = ({
  folderId,
  openedDocument,
  searchText,
  setSearchText,
  mode,
  nextMode
}: {
  folderId: string;
  openedDocument: string | undefined;
  mode: BrowserQueryMode;
  nextMode: () => void;
  searchText?: string | null;
  setSearchText: Dispatch<SetStateAction<string | undefined | null>>;
}) => {
  const history = useHistory();
  const [openFilters, setOpenFilters] = useState(false);
  const openedDocumentFolder = openedDocument
    ? collectionService.getItemParent(openedDocument)
    : null;

  return (
    <IonList class="inner-list">
      <SortFilterInlineList
        id={folderId}
        sortEnabled={mode === 'browser' && openFilters}
        searchEnabled={openFilters}
        searchText={searchText || ''}
        onSearch={val => {
          setSearchText(val);
        }}
      >
        <IonItem lines="none">
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton
                disabled={folderId === openedDocumentFolder || !openedDocument}
                onClick={() => {
                  if (openedDocumentFolder) {
                    history.push(
                      GET_ITEM_ROUTE(openedDocumentFolder, openedDocument)
                    );
                  }
                }}
              >
                <IonIcon icon={APPICONS.goToCurrentFolder}></IonIcon>
              </IonButton>
              <IonButton
                disabled={mode !== 'browser'}
                onClick={() => setOpenFilters(!openFilters)}
              >
                <IonIcon icon={APPICONS.sortFilter}></IonIcon>
              </IonButton>

              <IonButton
                disabled={mode === 'conflicts'}
                onClick={() => {
                  setOpenFilters(false);
                  nextMode();
                }}
              >
                <IonIcon icon={APPICONS.circleOptions}></IonIcon>
              </IonButton>
            </IonButtons>

            <IonButtons slot="end">
              <ExportItemsButton
                type={CollectionItemType.folder}
                id={folderId}
              />
              <ImportItemsButton parent={folderId} />

              <IonButton
                onClick={() => {
                  collectionService.addFolder(folderId);
                }}
              >
                <IonIcon aria-hidden="true" icon={APPICONS.addFolder} />
              </IonButton>
              <IonButton
                onClick={() => {
                  collectionService.addDocument(folderId);
                }}
              >
                <IonIcon aria-hidden="true" icon={APPICONS.addDocument} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonItem>
      </SortFilterInlineList>
    </IonList>
  );
};

export const CollectionItemBrowserList = ({
  parent: folder
}: CollectionItemBrowserListProps) => {
  const { t } = useLingui();
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const openedDocument = searchParams?.document;
  const hasConflicts = useHasLocalConflicts();

  const sort = fromCollectionItemSort(useFolderEffectiveSort(folder));
  const modeIdx = useNotebookLastBrowserMode();

  const modeTrans = new Map<BrowserQueryMode, string>();
  modeTrans.set('updatedAtRank', t`Last updated documents`);
  modeTrans.set('lastOpenedAtRank', t`Last consulted documents`);
  modeTrans.set('conflicts', t`Conflicts`);

  const currentMode = hasConflicts ? 'conflicts' : browserModes[modeIdx];
  const items: BrowsableItemResult[] = useCollectionItemBrowserListResults(
    currentMode,
    folder,
    sort
  );

  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  const [selectedItem, setSelectedItem] = useState<BrowsableItemResult | null>(
    null
  );

  useEffect(() => {
    setItemRenaming(undefined);
  }, [folder]);

  const [presentActions, dismissActions] = useIonPopover(
    ActionsFromBrowserToolbar,
    {
      id: selectedItem?.id,
      onClose: (role: string, data?: string) => {
        if (role === 'rename') {
          setItemRenaming(data);
        }
        if (role === 'delete') {
          history.replace(data!);
        }
        if (role === 'group') {
          history.push(data!);
        }
        dismissActions();
        setSelectedItem(null);
      }
    }
  );

  const [searchText, setSearchText] = useState<string | null>();
  const query =
    searchText && searchText.length > 0 ? searchText : searchParams.query;

  return (
    <CollectionItemList
      header={
        <>
          {currentMode === 'browser' ? (
            <CollectionItemBreadcrumb
              folder={folder}
              onClick={item => {
                history.push(GET_ITEM_ROUTE(item, openedDocument, query));
              }}
            ></CollectionItemBreadcrumb>
          ) : (
            <>
              <IonLabel style={{ lineHeight: '36px', marginLeft: '18px' }}>
                <i>{modeTrans.get(currentMode)}</i>
              </IonLabel>
            </>
          )}
        </>
      }
      searchText={searchText}
      reorderEnabled={sort.by === 'order'}
      items={items}
      selected={openedDocument}
      getUrl={item =>
        item.type === CollectionItemType.document
          ? GET_ITEM_ROUTE(item.parentId, item.id, query)
          : GET_ITEM_ROUTE(item.id, openedDocument, query)
      }
      actionsIcon={APPICONS.itemActions}
      itemRenaming={itemRenaming}
      onClickActions={(event, item) => {
        setSelectedItem(item);
        setItemRenaming(undefined);
        presentActions({
          event,
          alignment: 'end'
        });
      }}
      onRenamingDone={() => {
        setItemRenaming(undefined);
      }}
      footer={
        <CollectionItemBrowserListToolbar
          folderId={folder}
          openedDocument={openedDocument}
          searchText={searchText}
          setSearchText={setSearchText}
          mode={currentMode}
          nextMode={() => {
            let idx = modeIdx + 1;
            if (idx === browserModes.length) idx = 0;
            const notebook = notebooksService.getCurrentNotebook();
            settingsService.setNotebookDefaultBrowserMode(notebook, idx);
          }}
        />
      }
    />
  );
};

export default CollectionItemBrowserList;
