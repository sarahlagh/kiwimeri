import { GET_DOCUMENT_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import collectionService from '@/db_to_migrate/collection.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { statsService } from '@/domain/stats/stats-service';
import { conflictsService } from '@/domain/synchronization/conflicts-service';

import { ActionsFromDocumentEditorToolbar } from '@/features/collection-browser';
import { SearchActionsToolbar } from '@/features/search';
import { onTitleChangeFn } from '@/shared/misc/onTitleChangeFn';
import {
  InputCustomEvent,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { forwardRef, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import KiwimeriEditor from '../wysiwyg-editor/lexical/KiwimeriEditor';
import { KiwimeriEditorHandle } from '../wysiwyg-editor/lexical/KiwimeriEditorHandle';
import { serializeSelection } from '../wysiwyg-editor/lexical/selection-serializer';
import DocumentBottomSheet, { DocSheet } from './DocumentBottomSheet';
import './DocumentEditor.scss';
interface DocumentEditorProps {
  docId: string;
  showActions?: boolean;
  query?: string;
}

const DocumentEditor = forwardRef<KiwimeriEditorHandle, DocumentEditorProps>(
  function DocumentEditor(props, ref) {
    const [uniqId, setUniqId] = useState(0);

    const { docId, showActions = false, query } = { ...props };
    const parentId = collectionService.getItemParent(docId);

    const history = useHistory();
    const [showDocumentActions, setShowDocumentActions] =
      useState<boolean>(false);
    const [showBottomSheet, setShowBottomSheet] = useState(showActions);
    const [bottomSheet, setBottomSheet] = useState<DocSheet>('info');
    const [toggleSearch, setToggleSearch] = useState(false);
    const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
    const hasConflicts = conflictsService.useHasLocalConflicts();
    // TODO refactor
    useEffect(() => {
      setShowDocumentActions(showActions);
    }, [showActions]);

    const content = collectionService.useItemContent(docId);
    const documentTitle = collectionService.getItemTitle(docId);
    const onTitleChange = onTitleChangeFn(docId);

    const resumeState = resumeService.getDocumentResumeState(docId);

    useEffect(() => {
      statsService.updateGlobalStats(docId, { lastOpenedAt: Date.now() });
    }, [docId]);

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
              }}
            >
              <IonIcon icon={APPICONS.itemActions}></IonIcon>
            </IonButton>
          </IonToolbar>
          {showDocumentActions && (
            <ActionsFromDocumentEditorToolbar
              docId={docId}
              onClose={(role, data) => {
                if (role === 'info' || role === 'stats') {
                  setBottomSheet(role);
                  setShowBottomSheet(true);
                  setShowDocumentActions(false);
                } else if (role === 'restore') {
                  setUniqId(uniqId + 1); // force editor to reload content
                } else if (role === 'group') {
                  history.push(data!);
                } else {
                  setShowDocumentActions(false);
                }
              }}
              onSearch={() => {
                setShowDocumentActions(false);
                setToggleSearch(true);
                setToggleSearchAutoFocus(true);
              }}
            />
          )}
          {toggleSearch && (
            <SearchActionsToolbar
              searchText={query || ''}
              setToggleSearch={setToggleSearch}
              toggleSearchAutoFocus={toggleSearchAutoFocus}
              onValue={val => {
                history.push(GET_DOCUMENT_ROUTE(parentId, docId, val));
              }}
            />
          )}
        </IonHeader>

        <IonContent>
          {content && (
            <KiwimeriEditor
              ref={ref}
              id={`${docId}-${uniqId}`}
              content={content}
              selection={resumeState?.lastSelection || null}
              enableToolbar={!showDocumentActions && !toggleSearch}
              searchText={toggleSearch ? query : null}
              ignoreSelectionChange={false}
              onChange={(editorState, isSelectionChange) => {
                if (!isSelectionChange) {
                  collectionService.setItemLexicalContent(
                    docId,
                    editorState.toJSON()
                  );
                }
                resumeService.setLastSelection(
                  docId,
                  serializeSelection(editorState)
                );
              }}
            ></KiwimeriEditor>
          )}
        </IonContent>
        {showBottomSheet && (
          <DocumentBottomSheet
            id={docId}
            select={bottomSheet}
            className={bottomSheet}
            onCloseSelf={() => {
              setShowBottomSheet(false);
            }}
          />
        )}
        <IonFab
          className="document-editor-fab"
          slot="fixed"
          vertical="bottom"
          horizontal="end"
        >
          {!showBottomSheet && (
            <IonFabButton
              color={hasConflicts ? 'warning' : 'primary'}
              size="small"
              onClick={() => {
                setBottomSheet('notes');
                setShowBottomSheet(true);
              }}
            >
              <IonIcon icon={APPICONS.annotation}></IonIcon>
            </IonFabButton>
          )}
        </IonFab>
      </>
    );
  }
);

export default DocumentEditor;
