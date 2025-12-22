import { GET_UNKNOWN_ITEM_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import CollectionPagesBrowser from '@/common/wysiwyg/pages-browser/CollectionPagesBrowser';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { HistorizedCollectionItemData } from '../collection';
import CommonActionsToolbar from './CommonActionsToolbar';
import DocumentEditorFooter from './DocumentEditorFooter';
import SearchActionsToolbar from './SearchActionsToolbar';

interface DocumentEditorProps {
  docId: string;
  pageId?: string;
  version: number;
  showActions?: boolean;
  query?: string;
}

// TODO lexical toolbar -> only keep button to show page browser?
// TODO show tags but keep read only
// TODO document actions only keep read only actions like export, show info, search
// TODO css to show that we are on history
// TODO show latest (non-versioned) change at top of list too

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
  const [showDocumentFooter, setShowDocumentFooter] = useState(showActions);
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
  const reloadId = `${itemId}/${version}`;
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
      if (pages.length > 0 && query.length > 0) setOpenPageBrowser(true);
    }
  }, [query, docId]);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar class="ion-hide-md-down">
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
            showInfo={true}
            showDelete={false}
            onClose={role => {
              if (role === 'info') {
                setShowDocumentFooter(!showDocumentFooter);
              }
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
          </CommonActionsToolbar>
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={query || ''}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onValue={val => {
              history.push(GET_UNKNOWN_ITEM_ROUTE(itemId, itemType, val));
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
            pageBrowserButtonHighlighted={(pages?.length || 0) > 0}
            openPageBrowser={openPageBrowser}
            setOpenPageBrowser={setOpenPageBrowser}
          >
            {openPageBrowser && (
              <CollectionPagesBrowser
                id={itemId}
                docId={docId}
                docPreview={documentPreview || ''}
                pages={pages}
                searchText={toggleSearch ? query || '' : null}
                showHideSelf={toggleSearch}
              />
            )}
          </KiwimeriEditor>
        )}
      </IonContent>
      {showDocumentFooter && <DocumentEditorFooter id={docId} />}
    </>
  );
};
export default DocumentVersionViewer;
