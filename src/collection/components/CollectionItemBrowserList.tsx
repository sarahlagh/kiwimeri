import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonToolbar,
  useIonPopover
} from '@ionic/react';

import {
  CollectionItemResult,
  CollectionItemType
} from '@/collection/collection';
import ExportItemsButton from '@/common/buttons/ExportItemsButton';
import ImportItemsButton from '@/common/buttons/ImportItemsButton';
import OpenSortFilterButton from '@/common/buttons/OpenSortFilterButton';
import { useSearchContext } from '@/common/context/SearchContext';
import { GET_ITEM_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import CollectionItemBreadcrumb from './CollectionItemBreadcrumb';
import CollectionItemList from './CollectionItemList';
import CommonActionsToolbar from './CommonActionsToolbar';
import SearchActionsToolbar from './SearchActionsToolbar';

interface CollectionItemBrowserListProps {
  parent: string;
}

const CollectionItemBrowserListToolbar = ({
  folderId,
  openedDocument,
  searchText,
  setSearchText
}: {
  folderId: string;
  openedDocument: string | undefined;
  searchText?: string | null;
  setSearchText: Dispatch<SetStateAction<string | undefined | null>>;
}) => {
  const [toggleSearch, setToggleSearch] = useState(false);

  const history = useHistory();
  const openedDocumentFolder = openedDocument
    ? collectionService.getItemParent(openedDocument)
    : null;
  if (toggleSearch) {
    return (
      <SearchActionsToolbar
        searchText={searchText || ''}
        setSearchText={setSearchText}
        setToggleSearch={setToggleSearch}
        onClose={() => setSearchText(null)}
      />
    );
  }
  return (
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
        <OpenSortFilterButton id={folderId} />
        {platformService.hasHighlightSupport() && (
          <IonButton
            onClick={() => {
              setToggleSearch(true);
            }}
          >
            <IonIcon icon={APPICONS.search}></IonIcon>
          </IonButton>
        )}
      </IonButtons>

      <IonButtons slot="end">
        <ExportItemsButton type={CollectionItemType.folder} id={folderId} />
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
  );
};

export const CollectionItemBrowserList = ({
  parent: folder
}: CollectionItemBrowserListProps) => {
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const openedDocument = searchParams?.document;

  const displayOpts = collectionService.useItemEffectiveDisplayOpts(folder);
  const sort = displayOpts.sort;

  const items: CollectionItemResult[] =
    collectionService.useBrowsableCollectionItems(folder, sort);

  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  const [selectedItem, setSelectedItem] = useState<CollectionItemResult | null>(
    null
  );

  useEffect(() => {
    setItemRenaming(undefined);
  }, [folder]);

  const [presentActions, dismissActions] = useIonPopover(CommonActionsToolbar, {
    id: selectedItem?.id,
    docId: selectedItem?.id,
    showRename: true,
    onClose: (role: string, data?: string) => {
      if (role === 'rename') {
        setItemRenaming(data);
      }
      if (role === 'delete') {
        history.replace(data!);
      }
      dismissActions();
      setSelectedItem(null);
    }
  });

  const { searchText, setSearchText } = useSearchContext();

  return (
    <CollectionItemList
      header={
        // <IonToolbar className="slim">
        //   <CollectionItemBreadcrumb
        //     folder={folder}
        //     onClick={item => {
        //       history.push(GET_ITEM_ROUTE(item, openedDocument));
        //     }}
        //   />
        //   <OpenSortFilterButton id={folder} />
        // </IonToolbar>
        <CollectionItemBreadcrumb
          folder={folder}
          onClick={item => {
            history.push(GET_ITEM_ROUTE(item, openedDocument));
          }}
        />
      }
      searchText={searchText}
      reorderEnabled={sort.by === 'order'}
      items={items}
      selected={openedDocument}
      getUrl={item =>
        item.type === CollectionItemType.document
          ? GET_ITEM_ROUTE(item.parent, item.id)
          : GET_ITEM_ROUTE(item.id, openedDocument)
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
        />
      }
    />
  );
};

export default CollectionItemBrowserList;
