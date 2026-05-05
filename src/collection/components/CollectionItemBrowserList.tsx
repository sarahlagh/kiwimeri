import { useHistory, useLocation } from 'react-router-dom';

import {
  IonButton,
  IonButtons,
  IonIcon,
  IonLabel,
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
import { GET_ITEM_ROUTE } from '@/common/routes';
import { getSearchParams } from '@/common/utils';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import useCollectionItemBrowserListResults from '@/modules/collection/hooks/useCollectionItemBrowserListResults';
import { useLingui } from '@lingui/react/macro';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import CollectionItemBreadcrumb from './CollectionItemBreadcrumb';
import CollectionItemList from './CollectionItemList';
import ActionsFromBrowserToolbar from './actions/ActionsFromBrowserToolbar';

interface CollectionItemBrowserListProps {
  parent: string;
}

const modes = ['browser', 'updated', 'lastOpenedAt'] as const;
type Mode = (typeof modes)[number];

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
  mode: Mode;
  nextMode: () => void;
  searchText?: string | null;
  setSearchText: Dispatch<SetStateAction<string | undefined | null>>;
}) => {
  const history = useHistory();
  const openedDocumentFolder = openedDocument
    ? collectionService.getItemParent(openedDocument)
    : null;
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
        <OpenSortFilterButton
          id={folderId}
          searchEnabled={true}
          sortEnabled={mode === 'browser'}
          searchText={searchText || ''}
          onSearch={val => {
            setSearchText(val);
          }}
        />
        <IonButton onClick={() => nextMode()}>
          <IonIcon icon={APPICONS.circleOptions}></IonIcon>
        </IonButton>
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
  const { t } = useLingui();
  const history = useHistory();
  const location = useLocation();
  const searchParams = getSearchParams(location.search);
  const openedDocument = searchParams?.document;

  const displayOpts = collectionService.useItemEffectiveDisplayOpts(folder);
  const sort = displayOpts.sort;

  const [modeIdx, setModeIdx] = useState(0);
  const modeTrans = new Map<Mode, string>();
  modeTrans.set('updated', t`Last updated documents`);
  modeTrans.set('lastOpenedAt', t`Last consulted documents`);

  const items: CollectionItemResult[] = useCollectionItemBrowserListResults(
    modes[modeIdx],
    folder,
    sort
  );

  const [itemRenaming, setItemRenaming] = useState<string | undefined>(
    undefined
  );
  const [selectedItem, setSelectedItem] = useState<CollectionItemResult | null>(
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
          {modes[modeIdx] === 'browser' ? (
            <CollectionItemBreadcrumb
              folder={folder}
              onClick={item => {
                history.push(
                  GET_ITEM_ROUTE(item, openedDocument, undefined, query)
                );
              }}
            ></CollectionItemBreadcrumb>
          ) : (
            <>
              <IonLabel style={{ lineHeight: '36px', marginLeft: '18px' }}>
                <i>{modeTrans.get(modes[modeIdx])}</i>
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
          ? GET_ITEM_ROUTE(item.parent, item.id, undefined, query)
          : GET_ITEM_ROUTE(item.id, openedDocument, undefined, query)
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
          mode={modes[modeIdx]}
          nextMode={() => {
            let idx = modeIdx + 1;
            if (idx === modes.length) idx = 0;
            setModeIdx(idx);
          }}
        />
      }
    />
  );
};

export default CollectionItemBrowserList;
