import { GET_DOCUMENT_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import collectionService from '@/domain/collection/collection.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import { writer } from '@/domain/document-edits/document-edits.service';
import { SearchActionsToolbar } from '@/features/search';
import { useHasLocalConflicts } from '@/features/synchronization-ui';
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
import {
  lazy,
  RefObject,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { useNavigate } from 'react-router';
import RichTextEditor from '../wysiwyg-editor/lexical-v2/RichTextEditor';
import { RichTextEditorHandle } from '../wysiwyg-editor/lexical-v2/RichTextEditorHandle';
import { $getChangedBlocks } from '../wysiwyg-editor/lexical-v2/utils/node-serializer';
import { serializeSelection } from '../wysiwyg-editor/lexical/node-serializer';
import DocumentBottomSheet, { DocSheet } from './DocumentBottomSheet';
import './DocumentEditor.scss';

const ActionsFromDocumentEditorToolbar = lazy(() =>
  import('@/features/collection-item-actions').then(m => ({
    default: m.ActionsFromDocumentEditorToolbar
  }))
);

export type DocumentEditorHandle = {
  refreshContent: () => void;
} & RichTextEditorHandle;

interface DocumentEditorProps {
  docId: string;
  showActions?: boolean;
  query?: string;
  ref: RefObject<DocumentEditorHandle | null>;
}

const DocumentEditor = (props: DocumentEditorProps) => {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const contentRef = useRef('');
  const [key, setKey] = useState(0);

  const { docId, showActions = false, query } = { ...props };

  const refreshContent = useCallback(() => {
    contentRef.current = collectionService.getDocumentContent(docId);
    setKey(key + 1);
  }, [key, setKey, docId]);

  useImperativeHandle(
    props.ref,
    () => ({
      getEditor() {
        return editorRef.current?.getEditor() || null;
      },
      focusEditor() {
        editorRef.current?.focusEditor();
      },
      getEditorContext() {
        return editorRef.current?.getEditorContext() || null;
      },
      refreshContent
    }),
    [editorRef, refreshContent]
  );

  const parentId = collectionService.getItemParent(docId);
  const searchText = query ? decodeURI(query) : '';

  const navigate = useNavigate();
  const [showDocumentActions, setShowDocumentActions] =
    useState<boolean>(false);
  const [showBottomSheet, setShowBottomSheet] = useState(showActions);
  const [bottomSheet, setBottomSheet] = useState<DocSheet>('info');
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  const hasConflicts = useHasLocalConflicts();
  // TODO refactor
  useEffect(() => {
    // eslint-disable-next-line @eslint-react/set-state-in-effect
    setShowDocumentActions(showActions);
  }, [showActions]);

  contentRef.current = collectionService.getDocumentContent(docId);
  const documentTitle = collectionService.getItemTitle(docId);
  const onTitleChange = onTitleChangeFn(docId);

  const resumeState = resumeService.getDocumentResumeState(docId);

  useEffect(() => {
    collectionService.setLastOpenedAt(docId, Date.now());
    schedule.flushByName(TaskNames.FAST_WRITE);
  }, [docId]);

  useEffect(() => {
    if (searchText) {
      // eslint-disable-next-line @eslint-react/set-state-in-effect
      setToggleSearch(searchText.length > 0);
      // eslint-disable-next-line @eslint-react/set-state-in-effect
      setToggleSearchAutoFocus(false);
    }
  }, [searchText, docId]);

  return (
    <>
      <IonHeader>
        {/*only visible in non compact mode*/}
        <IonToolbar className="ion-hide-md-down">
          <IonTitle>
            <IonInput
              className="invisible"
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
          <Suspense
            fallback={
              <IonToolbar color="medium" style={{ height: 56 + 'px' }} />
            }
          >
            <ActionsFromDocumentEditorToolbar
              docId={docId}
              onClose={(role, data) => {
                if (role === 'info' || role === 'stats') {
                  setBottomSheet(role);
                  setShowBottomSheet(true);
                  setShowDocumentActions(false);
                } else if (role === 'restore') {
                  refreshContent();
                } else if (role === 'group') {
                  navigate(data!);
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
          </Suspense>
        )}
        {toggleSearch && (
          <SearchActionsToolbar
            searchText={searchText}
            setToggleSearch={setToggleSearch}
            toggleSearchAutoFocus={toggleSearchAutoFocus}
            onValue={val => {
              navigate(GET_DOCUMENT_ROUTE(parentId, docId, val));
            }}
          />
        )}
      </IonHeader>

      <IonContent>
        {contentRef.current && (
          <RichTextEditor
            ref={editorRef}
            reloadKey={key}
            additionalClassNames={'document-editor'}
            historyId={docId}
            initialState={contentRef.current}
            serializedSelection={resumeState?.lastSelection || null}
            enableToolbar={!showDocumentActions && !toggleSearch}
            searchText={toggleSearch ? searchText : undefined}
            ignoreSelectionChange={false}
            resumeLastSelection={deviceSettings.get('resumeLastSelection')}
            zoomLevel={deviceSettings.get('globalZoom')}
            onZoomChange={zoomLevel => {
              deviceSettings.set('globalZoom', zoomLevel);
            }}
            onChange={payload => {
              if (!payload.isSelectionChange) {
                const { blocksChanged, hasDeletedNodes } =
                  payload.editorState.read(() => {
                    return $getChangedBlocks(payload);
                  });
                writer.fastWriteOrCommit(
                  SpaceTables.Collection,
                  docId,
                  payload.editorState,
                  blocksChanged,
                  hasDeletedNodes,
                  payload
                );
              }
              resumeService.setLastSelection(
                docId,
                serializeSelection(payload.editorState)
              );
            }}
          />
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
};

export default DocumentEditor;
