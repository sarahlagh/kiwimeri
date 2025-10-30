import { onTitleChangeFn } from '@/common/events/events';
import KiwimeriEditor from '@/common/wysiwyg/lexical/KiwimeriEditor';
import CollectionPagesBrowser from '@/common/wysiwyg/pages-browser/CollectionPagesBrowser';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
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

interface DocumentEditorProps {
  docId: string;
  pageId?: string;
  showActions?: boolean;
}

const DocumentEditor = ({
  docId,
  pageId,
  showActions = false
}: DocumentEditorProps) => {
  const refWriter = useRef(null);
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [showDocumentFooter, setShowDocumentFooter] = useState(showActions);
  const [openPageBrowser, setOpenPageBrowser] = useState(false);

  useEffect(() => {
    setShowDocumentActions(showActions);
  }, [showActions]);

  const itemId = pageId ? pageId : docId;
  const content = collectionService.useItemContent(itemId);
  const documentTitle = collectionService.getItemTitle(docId);
  const documentPreview = collectionService.useItemPreview(docId) || '';

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
          />
        )}
      </IonHeader>

      <IonContent onClick={onClickedAnywhere}>
        {content && (
          <KiwimeriEditor
            ref={refWriter}
            initId={docId}
            content={content}
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
