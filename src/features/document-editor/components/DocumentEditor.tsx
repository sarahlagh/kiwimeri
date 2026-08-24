import { GET_DOCUMENT_ROUTE } from '@/app/routes';
import { APPICONS } from '@/constants';
import { SpaceTables } from '@/core/db/store-constants';
import { schedule } from '@/core/tasks/scheduler.service';
import { TaskNames } from '@/core/tasks/tasks-registry';
import collectionService from '@/domain/collection/collection.service';
import { resumeService } from '@/domain/collection/resume-state.service';
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
  forwardRef,
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { useNavigate } from 'react-router';
import KiwimeriEditor from '../wysiwyg-editor/lexical/KiwimeriEditor';
import {
  KiwimeriEditorHandle,
  ReloadableKiwimeriEditorHandle
} from '../wysiwyg-editor/lexical/KiwimeriEditorHandle';
import { serializeSelection } from '../wysiwyg-editor/lexical/node-serializer';
import DocumentBottomSheet, { DocSheet } from './DocumentBottomSheet';
import './DocumentEditor.scss';

const ActionsFromDocumentEditorToolbar = lazy(() =>
  import('@/features/collection-item-actions').then(m => ({
    default: m.ActionsFromDocumentEditorToolbar
  }))
);

interface DocumentEditorProps {
  docId: string;
  showActions?: boolean;
  query?: string;
}

const DocumentEditor = forwardRef<
  ReloadableKiwimeriEditorHandle,
  DocumentEditorProps
>(function DocumentEditor(props, ref) {
  const [uniqId, setUniqId] = useState(0);
  const editorRef = useRef<KiwimeriEditorHandle | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      focusEditor() {
        editorRef.current?.focusEditor();
      },
      refreshContent() {
        setUniqId(uniqId + 1); // force editor to reload content
      }
    }),
    [uniqId, setUniqId, editorRef]
  );

  const { docId, showActions = false, query } = { ...props };
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
    setShowDocumentActions(showActions);
  }, [showActions]);

  const content = collectionService.getDocumentContent(docId);
  const documentTitle = collectionService.getItemTitle(docId);
  const onTitleChange = onTitleChangeFn(docId);

  const resumeState = resumeService.getDocumentResumeState(docId);

  useEffect(() => {
    collectionService.setLastOpenedAt(docId, Date.now());
    schedule.flushByName(TaskNames.FAST_WRITE);
  }, [docId]);

  useEffect(() => {
    if (searchText) {
      setToggleSearch(searchText.length > 0);
      setToggleSearchAutoFocus(false);
    }
  }, [searchText, docId]);

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
                  setUniqId(uniqId + 1); // force editor to reload content
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
        {content && (
          <KiwimeriEditor
            ref={editorRef}
            additionalClassNames={'document-editor'}
            id={`${docId}-${uniqId}`}
            content={content}
            selection={resumeState?.lastSelection || null}
            enableToolbar={!showDocumentActions && !toggleSearch}
            searchText={toggleSearch ? searchText : null}
            ignoreSelectionChange={false}
            onChange={(
              editorState,
              isSelectionChange,
              blocksChanged,
              hasDeletedNodes
            ) => {
              writer.fastWrite(
                SpaceTables.Collection,
                docId,
                editorState,
                isSelectionChange,
                blocksChanged,
                hasDeletedNodes
              );
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
});

export default DocumentEditor;
