import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import {
  ReactNode,
  RefObject,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react';
import { AppExtensionConfig, buildAppExtension } from './app-extension';
import { ReactSearchExtension } from './extensions/ReactSearchExtension';
import {
  GlobalReactContextProvider,
  ReadOnlyGlobalReactContext
} from './react/GlobalReactContext';
import GlobalReactContextRefPlugin from './react/GlobalReactContextRefPlugin';
import OnChangePlugin, { OnChangePluginPayload } from './react/OnChangePlugin';
import ReloadPlugin from './react/ReloadPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { RichTextEditorInitialData } from './types';

export type RichTextEditorProps = AppExtensionConfig &
  RichTextEditorInitialData & {
    searchText?: string;
    enableToolbar?: boolean;
    enableOnChange?: boolean;
    enableDebugTree?: boolean;
    ignoreSelectionChange?: boolean;
    additionalClassNames?: string;
    onChange?: (payload: OnChangePluginPayload) => void;
  } & {
    readonly children?: ReactNode;
  };

const RichTextEditor = (
  props: RichTextEditorProps & {
    ref?: RefObject<RichTextEditorHandle | null>;
  }
) => {
  const { t } = useLingui();
  const editorRef = useRef<LexicalEditor | null>(null);
  const contextRef = useRef<ReadOnlyGlobalReactContext | null>(null);
  const historyStoreRef = useRef(new Map<string, HistoryState>());
  const placeholder = t`Text...`;

  const {
    onChange,
    editable: globalEditable = true,
    ignoreSelectionChange = true,
    enableToolbar = true,
    enableHistory = true,
    enableDebugTree = false,
    resumeLastSelection = false,
    searchText,
    additionalClassNames,
    ref,
    children
  } = props;

  useImperativeHandle(
    ref,
    () => ({
      getEditor() {
        return editorRef.current;
      },
      getContext() {
        return contextRef.current;
      },
      focusEditor() {
        // note: this resumes the selection on small screens, but also triggers keyboard on small screen + android
        // this is annoying, but no known workarounds at this time
        // this will not be called on wide screens so not an issue there
        editorRef.current?.focus();
      }
    }),
    [editorRef, contextRef]
  );

  const appExtension = useMemo(() => {
    return buildAppExtension({
      initialZoom: props.initialZoom,
      onZoomChange: props.onZoomChange
    });
  }, [props.initialZoom, props.onZoomChange]);

  return (
    <GlobalReactContextProvider
      globalEditable={globalEditable}
      historyEnabled={enableHistory}
    >
      <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
        <div className="editor-container">
          {enableToolbar && <Toolbar />}
          <div className="editor-inner">
            <ContentEditable
              className={
                'editor-input' +
                (enableToolbar ? ' editor-toolbar' : '') +
                (additionalClassNames ? ` ${additionalClassNames}` : '')
              }
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
        <GlobalReactContextRefPlugin contextRef={contextRef} />
        {onChange && (
          <OnChangePlugin
            ignoreSelectionChange={ignoreSelectionChange}
            onChange={onChange}
          />
        )}
        <ReloadPlugin
          historyStoreRef={historyStoreRef}
          editable={globalEditable}
          historyId={props.historyId}
          initialState={props.initialState}
          reloadKey={props.reloadKey}
          resumeLastSelection={resumeLastSelection}
          initialSelection={props.initialSelection}
          enableHistory={enableHistory}
        />
        <ExtensionComponent
          lexical:extension={ReactSearchExtension}
          searchText={searchText}
        />
        {children}
      </LexicalExtensionComposer>
    </GlobalReactContextProvider>
  );
};

export default RichTextEditor;
