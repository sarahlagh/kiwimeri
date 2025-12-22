import { GET_UNKNOWN_ITEM_ROUTE, GET_VERSIONED_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import CollectionPagesBrowser from '@/common/wysiwyg/pages-browser/CollectionPagesBrowser';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { HistorizedCollectionItemData } from '../collection';
import CommonActionsToolbar from './CommonActionsToolbar';
import SearchActionsToolbar from './SearchActionsToolbar';

interface DocumentEditorProps {
  docId: string;
  pageId?: string;
  version: string;
  showActions?: boolean;
  query?: string;
}

// TODO test search on pages

const DocumentVersionFooter = ({
  versionData
}: {
  versionData: HistorizedCollectionItemData;
}) => {
  const itemTags: string[] = versionData.tags?.split(',') || [];
  return (
    <IonFooter
      style={{ overflowX: 'auto', flexWrap: 'nowrap', display: 'flex' }}
    >
      <IonItem className="inner-item">
        <IonText>{itemTags.join(', ')}</IonText>
      </IonItem>
    </IonFooter>
  );
};

const DocumentVersionViewer = ({
  docId,
  pageId,
  version,
  showActions = false,
  query
}: DocumentEditorProps) => {
  const history = useHistory();
  const refWriter = useRef(null);
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [openPageBrowser, setOpenPageBrowser] = useState(false);
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);

  // TODO refactor
  useEffect(() => {
    setShowDocumentActions(showActions);
  }, [showActions]);

  const versionedItem = historyService.useVersion(docId, version);
  const versionData = versionedItem
    ? (JSON.parse(versionedItem.versionData) as HistorizedCollectionItemData)
    : undefined;

  const itemId = pageId ? pageId : docId;
  const reloadId = version;
  const content = versionData?.content;
  const documentTitle = versionData?.title;
  const documentPreview = versionedItem?.versionPreview;
  const itemType = collectionService.getItemType(itemId);

  const displayOpts = collectionService.useItemEffectiveDisplayOpts(docId);
  const sort = displayOpts.sort;

  const pages = collectionService.useDocumentPages(docId, sort);

  useEffect(() => {
    if (query) {
      setToggleSearch(query.length > 0);
      setToggleSearchAutoFocus(false);
    }
  }, [query, docId]);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar class="ion-hide-md-down" color="tertiary">
          <IonTitle>
            <IonLabel>{documentTitle}</IonLabel>
          </IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            color={'dark'}
            onClick={() => {
              setShowDocumentActions(!showDocumentActions);
              setToggleSearch(false);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showDocumentActions && (
          <CommonActionsToolbar
            id={itemId}
            docId={docId}
            showMoveFolder={false}
            showRename={false}
            showClose={true}
            showInfo={false}
            showDelete={false}
            getBackRoute={() => GET_UNKNOWN_ITEM_ROUTE(itemId, itemType, query)}
            onClose={() => {
              setShowDocumentActions(false);
            }}
          >
            {platformService.hasHighlightSupport() && (
              <IonButton
                onClick={() => {
                  setShowDocumentActions(false);
                  setToggleSearch(true);
                  setToggleSearchAutoFocus(true);
                  if (pages.length > 0) setOpenPageBrowser(true);
                }}
              >
                <IonIcon icon={APPICONS.search}></IonIcon>
              </IonButton>
            )}
            <IonButton
              slot="end"
              fill="clear"
              onClick={() => setOpenPageBrowser(!openPageBrowser)}
            >
              <IonIcon icon={APPICONS.page}></IonIcon>
            </IonButton>
          </CommonActionsToolbar>
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={query || ''}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onValue={val => {
              history.push(GET_VERSIONED_ROUTE(itemId, itemType, version, val));
            }}
          />
        )}
      </IonHeader>

      <IonContent>
        {content && (
          <KiwimeriEditor
            ref={refWriter}
            id={reloadId}
            editable={false}
            enableToolbar={false}
            content={content}
            searchText={toggleSearch ? query : null}
            enablePageBrowser={true}
            openPageBrowser={openPageBrowser}
          >
            {openPageBrowser && (
              <CollectionPagesBrowser
                id={itemId}
                docId={docId}
                docPreview={documentPreview || ''}
                pages={pages}
                searchText={toggleSearch ? query || '' : null}
                showHideSelf={false}
                editable={false}
              />
            )}
          </KiwimeriEditor>
        )}
      </IonContent>
      {versionData && <DocumentVersionFooter versionData={versionData} />}
    </>
  );
};
export default DocumentVersionViewer;
