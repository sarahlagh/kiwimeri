import ManageHistoryButton from '@/common/buttons/ManageHistoryButton';
import { GET_UNKNOWN_ITEM_ROUTE, GET_VERSIONED_ROUTE } from '@/common/routes';
import platformService from '@/common/services/platform.service';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import CollectionPagesBrowser from '@/common/wysiwyg/pages-browser/CollectionPagesBrowser';
import { APPICONS } from '@/constants';
import { historyService } from '@/db/collection-history.service';
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
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { CollectionItemSnapshotData, CollectionItemType } from '../collection';
import CommonActionsToolbar from './CommonActionsToolbar';
import SearchActionsToolbar from './SearchActionsToolbar';

interface DocumentVersionViewerProps {
  docId: string;
  pageId?: string;
  docVersion: string;
  pageVersion?: string;
  showActions?: boolean;
  folder: string;
  query?: string;
}

// TODO test search on pages

const DocumentVersionFooter = ({
  versionData
}: {
  versionData: CollectionItemSnapshotData;
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
  docVersion,
  pageVersion,
  showActions = false,
  folder,
  query
}: DocumentVersionViewerProps) => {
  const history = useHistory();
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [openPageBrowser, setOpenPageBrowser] = useState(false);
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  // TODO refactor
  useEffect(() => {
    setShowDocumentActions(showActions);
  }, [showActions]);

  const itemId = pageId ? pageId : docId;
  const versionId = pageVersion ? pageVersion : docVersion;

  const versionedItem = historyService.useVersion(versionId);
  const content = versionedItem?.content;
  const versionData = versionedItem?.snapshotJson;

  const versionedDoc = historyService.useVersion(docVersion);
  const docVersionData = versionedDoc?.snapshotJson;
  const documentTitle = docVersionData?.title;
  const documentPreview = versionedDoc?.preview;

  const itemType = pageId
    ? CollectionItemType.page
    : CollectionItemType.document;

  const pages = historyService.useDocumentVersionedPages(docId, docVersion);

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
            <ManageHistoryButton id={docId} onRestore={() => {}} />
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
              history.push(
                GET_VERSIONED_ROUTE(
                  itemType,
                  docVersion,
                  docId,
                  folder,
                  pageId,
                  pageVersion,
                  val
                )
              );
            }}
          />
        )}
      </IonHeader>

      <IonContent>
        {content && (
          <KiwimeriEditor
            id={versionId}
            editable={false}
            enableToolbar={false}
            content={content}
            searchText={toggleSearch ? query : null}
            enablePageBrowser={true}
          >
            {pages.length > 0 && (
              <CollectionPagesBrowser
                id={itemId}
                docId={docId}
                docPreview={documentPreview || ''}
                pages={pages}
                searchText={toggleSearch ? query || '' : null}
                showActions={false}
                editable={false}
                getUrl={(folderId, docId, pageId, searchText) => {
                  if (!pageId) {
                    return GET_VERSIONED_ROUTE(
                      CollectionItemType.document,
                      docVersion,
                      docId,
                      folderId,
                      undefined,
                      undefined,
                      searchText
                    );
                  }
                  // !! must find the pageVersion for the pageId
                  const pageVersions =
                    historyService.getPagesForVersion(docVersion);
                  const pageVersion = pageVersions.find(
                    v => v.itemId === pageId
                  )?.id;
                  return GET_VERSIONED_ROUTE(
                    CollectionItemType.page,
                    docVersion,
                    docId,
                    folderId,
                    pageId,
                    pageVersion,
                    searchText
                  );
                }}
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
