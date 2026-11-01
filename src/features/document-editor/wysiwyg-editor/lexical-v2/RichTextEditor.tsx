import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import { RefObject, useImperativeHandle, useRef } from 'react';
import { appExtension } from './app-extension';
import { EditorContextProvider, ReadOnlyEditorContext } from './EditorContext';
import EditorContextRefPlugin from './react-plugins/EditorContextRefPlugin';
import OnChangePlugin, {
  OnChangePluginPayload
} from './react-plugins/OnChangePlugin';
import ReloadInitialConfigPlugin from './react-plugins/ReloadInitialConfigPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { RichTextEditorInitialData } from './types';

export type RichTextEditorProps = RichTextEditorInitialData & {
  enableToolbar?: boolean;
  enableDebugTree?: boolean;
  ignoreSelectionChange?: boolean;
  onChange?: (payload: OnChangePluginPayload) => void;
  onZoomChange?: (zoomLevel: number) => void;
};

const RichTextEditor = ({
  onChange,
  zoomLevel,
  onZoomChange,
  initialState,
  serializedSelection,
  historyId,
  resumeLastSelection = false,
  ignoreSelectionChange = true,
  globalEditable = true,
  enableToolbar = true,
  enableDebugTree = false,
  ref
}: RichTextEditorProps & {
  ref?: RefObject<RichTextEditorHandle | null>;
}) => {
  const { t } = useLingui();
  const editorRef = useRef<LexicalEditor | null>(null);
  const contextRef = useRef<ReadOnlyEditorContext | null>(null);
  const placeholder = t`Text...`;

  const isReloadingRef = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      getEditor() {
        return editorRef.current;
      },
      getEditorContext() {
        return contextRef.current;
      }
    }),
    [editorRef]
  );

  return (
    <EditorContextProvider
      globalEditable={globalEditable}
      historyId={historyId}
    >
      <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
        <div className="editor-container">
          {enableToolbar && <Toolbar />}
          <div className="editor-inner">
            <ContentEditable
              className="editor-input"
              aria-label={t`Rich text editor`}
              aria-placeholder={placeholder}
              placeholder={
                <div className="editor-placeholder">{placeholder}</div>
              }
            />
            {enableDebugTree && (
              <ExtensionComponent lexical:extension={TreeViewExtension} />
            )}
          </div>
        </div>
        <EditorRefPlugin editorRef={editorRef} />
        <EditorContextRefPlugin contextRef={contextRef} />
        <ReloadInitialConfigPlugin
          isReloadingRef={isReloadingRef}
          initialState={initialState}
          globalEditable={globalEditable}
          serializedSelection={serializedSelection}
          historyId={historyId}
          resumeLastSelection={resumeLastSelection}
          zoomLevel={zoomLevel}
        />
        <OnChangePlugin
          isReloadingRef={isReloadingRef}
          ignoreSelectionChange={ignoreSelectionChange}
          onChange={payload => {
            if (onChange) onChange(payload);
          }}
          onZoomChange={onZoomChange}
        />
      </LexicalExtensionComposer>
    </EditorContextProvider>
  );
};

export default RichTextEditor;
