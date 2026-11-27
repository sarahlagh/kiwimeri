import { GET_DOCUMENT_ROUTE } from '@/app/routes';
import { appConfig } from '@/config';
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
  useMemo,
  useRef,
  useState
} from 'react';
import { useNavigate } from 'react-router';

import { useSearchQuery } from '@/app/context/RouteContext';
import useItemTitle from '@/app/hooks/useItemTitle';
import {
  getChangedBlocks,
  OnChangePluginPayload,
  RichTextEditor,
  RichTextEditorHandle,
  serializeSelection
} from '@/features/rich-text-editor';
import { noop } from '@/shared/utils';
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
  setShowActions?: (showActions: boolean) => void;
  ref: RefObject<DocumentEditorHandle | null>;
}

function onZoomChange(zoomLevel: number) {
  deviceSettings.set('globalZoom', zoomLevel);
}

const DocumentEditor = (props: DocumentEditorProps) => {
  const editorRef = useRef<RichTextEditorHandle | null>(null);
  const [key, setKey] = useState(0);

  const { docId, showActions = false, setShowActions = noop, ref } = props;

  const refreshContent = useCallback(() => {
    setKey(key + 1);
  }, [key, setKey]);

  useImperativeHandle(
    ref,
    () => ({
      getEditor() {
        return editorRef.current?.getEditor() || null;
      },
      getContext() {
        return editorRef.current?.getContext() || null;
      },
      focusEditor() {
        editorRef.current?.focusEditor();
      },
      refreshContent
    }),
    [editorRef, refreshContent]
  );

  const parentId = collectionService.getItemParent(docId);
  const searchText = useSearchQuery() || '';

  const navigate = useNavigate();
  const [showBottomSheet, setShowBottomSheet] = useState(showActions);
  const [bottomSheet, setBottomSheet] = useState<DocSheet>('info');
  const [toggleSearch, setToggleSearch] = useState(false);
  const [toggleSearchAutoFocus, setToggleSearchAutoFocus] = useState(true);
  const hasConflicts = useHasLocalConflicts();

  const documentTitle = useItemTitle(docId);
  const onTitleChange = onTitleChangeFn(docId);

  useEffect(() => {
    collectionService.setLastOpenedAt(docId, Date.now());
    schedule.flushByName(TaskNames.FAST_WRITE);
  }, [docId]);

  const onChange: (change: OnChangePluginPayload) => void = useCallback(
    payload => {
      if (!payload.isSelectionChange) {
        const { blocksChanged, hasDeletedNodes } = getChangedBlocks(payload);
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
    },
    [docId]
  );

  const initialValueBag = useMemo(
    () => ({
      initialState: collectionService.getDocumentContent(docId),
      resumeState: resumeService.getDocumentResumeState(docId),
      resumeLastSelection: deviceSettings.get('resumeLastSelection'),
      initialZoom: deviceSettings.get('globalZoom')
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docId, key]
  );

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
              setShowActions(!showActions);
              setToggleSearch(false);
            }}
          >
            <IonIcon icon={APPICONS.itemActions}></IonIcon>
          </IonButton>
        </IonToolbar>
        {showActions && (
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
                  setShowActions(false);
                } else if (role === 'restore') {
                  refreshContent();
                } else if (role === 'group') {
                  navigate(data!);
                } else {
                  setShowActions(false);
                }
              }}
              onSearch={() => {
                setShowActions(false);
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
        <RichTextEditor
          ref={editorRef}
          instanceType="DocumentEditor"
          reloadKey={key}
          additionalClassNames={'document-editor'}
          historyId={docId}
          initialState={initialValueBag.initialState}
          initialSelection={initialValueBag.resumeState?.lastSelection || null}
          enableHistory={true}
          enableToolbar={!showActions && !toggleSearch}
          enableDebugTree={appConfig.DEV_ENABLE_LEXICAL_DEBUG_TREE}
          searchText={toggleSearch ? searchText : undefined}
          ignoreSelectionChange={false}
          resumeLastSelection={initialValueBag.resumeLastSelection}
          initialZoom={initialValueBag.initialZoom}
          onZoomChange={onZoomChange}
          onChange={onChange}
        />
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
