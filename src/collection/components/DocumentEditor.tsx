import { onTitleChangeFn } from '@/common/events/events';
import platformService from '@/common/services/platform.service';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import CollectionPagesBrowser from '@/common/wysiwyg/pages-browser/CollectionPagesBrowser';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import { searchService } from '@/search/collection-search.service';
import {
  InputCustomEvent,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useRef, useState } from 'react';
import CommonActionsToolbar from './CommonActionsToolbar';
import DocumentEditorFooter from './DocumentEditorFooter';
import SearchActionsToolbar from './SearchActionsToolbar';

interface DocumentEditorProps {
  docId: string;
  pageId?: string;
  showActions?: boolean;
  query?: string;
}

const MAX_WEIGHT = 10;

const DocumentEditor = ({
  docId,
  pageId,
  showActions = false,
  query
}: DocumentEditorProps) => {
  const refWriter = useRef(null);
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [showDocumentFooter, setShowDocumentFooter] = useState(showActions);
  const [openPageBrowser, setOpenPageBrowser] = useState(false);
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [localSearchTextWeight, setLocalSearchTextWeight] = useState(0);

  // TODO refactor
  useEffect(() => {
    setShowDocumentActions(showActions);
  }, [showActions]);

  const itemId = pageId ? pageId : docId;
  const content = collectionService.useItemContent(itemId);
  const documentTitle = collectionService.getItemTitle(docId);
  const documentPreview = searchService.useItemPreview(docId) || '';

  const displayOpts = collectionService.useItemEffectiveDisplayOpts(docId);
  const sort = displayOpts.sort;

  const pages = collectionService.useDocumentPages(docId, sort);
  const onTitleChange = onTitleChangeFn(docId);

  const onClickedAnywhere: React.MouseEventHandler<HTMLIonContentElement> = (
    event: React.MouseEvent<HTMLIonContentElement, MouseEvent>
  ) => {
    const target = event.target as HTMLIonContentElement;
    // exclude text area & toolbar from this handler
    // focus the text editor when clicking on empty ion-content
    if (
      refWriter.current &&
      target.role === 'main' &&
      target.localName === 'ion-content'
    ) {
      const ref = refWriter.current as HTMLBaseElement;
      ref.focus();
    }
  };

  useEffect(() => {
    if (localSearchTextWeight < MAX_WEIGHT) {
      const searchTextOverride = query || '';
      setSearchText(searchTextOverride);
      setToggleSearch(searchTextOverride.length > 0);
      setToggleSearchAutoFocus(false);
      if (pages.length > 0 && searchTextOverride.length > 0)
        setOpenPageBrowser(true);
    }
  }, [query, docId]);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar class="ion-hide-md-down">
          <IonTitle>
            <IonInput
              class="invisible"
              value={documentTitle}
              onIonChange={(e: InputCustomEvent) => {
                if (typeof e.detail.value === 'string') {
                  onTitleChange(e.detail.value || '');
                }
              }}
            ></IonInput>
          </IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            color={'dark'}
            onClick={() => {
              setShowDocumentActions(!showDocumentActions);
              setToggleSearch(false);
              setLocalSearchTextWeight(0);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showDocumentActions && (
          <CommonActionsToolbar
            id={itemId}
            docId={docId}
            showClose={true}
            showInfo={true}
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
                  setLocalSearchTextWeight(MAX_WEIGHT);
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
            searchText={searchText}
            setSearchText={setSearchText}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onInput={() => {
              setLocalSearchTextWeight(MAX_WEIGHT);
            }}
            onClose={() => {
              setLocalSearchTextWeight(0);
            }}
          />
        )}
      </IonHeader>

      <IonContent onClick={onClickedAnywhere}>
        {content && (
          <KiwimeriEditor
            ref={refWriter}
            id={itemId}
            content={content}
            enableToolbar={!showDocumentActions && !toggleSearch}
            searchText={toggleSearch ? searchText : null}
            onChange={editorState => {
              collectionService.setItemLexicalContent(
                itemId,
                editorState.toJSON()
              );
            }}
            enablePageBrowser={true}
            pageBrowserButtonHighlighted={(pages?.length || 0) > 0}
            openPageBrowser={openPageBrowser}
            setOpenPageBrowser={setOpenPageBrowser}
          >
            {openPageBrowser && (
              <CollectionPagesBrowser
                id={itemId}
                docId={docId}
                docPreview={documentPreview}
                pages={pages}
                searchText={toggleSearch ? searchText : null}
              />
            )}
          </KiwimeriEditor>
        )}
      </IonContent>
      {showDocumentFooter && <DocumentEditorFooter id={docId} />}
    </>
  );
};
export default DocumentEditor;
