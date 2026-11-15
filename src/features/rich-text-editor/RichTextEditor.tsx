import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import { ReactNode, RefObject, useImperativeHandle, useRef } from 'react';
import { appExtension } from './app-extension';
import {
  OnChangeExtensionPropsBridge,
  OnChangePluginPayload
} from './extensions/OnChangeExtension';
import { ZoomExtensionPropsBridge } from './extensions/ZoomExtension';
import {
  EditorInstanceContextProvider,
  ReadOnlyEditorInstanceContext
} from './react/EditorInstanceContext';
import EditorInstanceContextRefPlugin from './react/EditorInstanceContextRefPlugin';
import ReloadPlugin from './react/ReloadPlugin';
import { SearchPlugin } from './react/SearchPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { RichTextEditorInitialData } from './types';

export type RichTextEditorProps = RichTextEditorInitialData & {
  searchText?: string;
  enableToolbar?: boolean;
  enableOnChange?: boolean;
  enableDebugTree?: boolean;
  ignoreSelectionChange?: boolean;
  additionalClassNames?: string;
  initialZoom?: number;
  onZoomChange?: (zoomLevel: number) => void;
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
  const contextRef = useRef<ReadOnlyEditorInstanceContext | null>(null);
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

  return (
    <EditorInstanceContextProvider
      globalEditable={globalEditable}
      historyEnabled={enableHistory}
    >
      <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
        <div className="editor-container">
          {enableToolbar && <Toolbar />}
          <div className="editor-inner">
            <ContentEditable
              className={
                'editor-input ' +
                props.instanceType +
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
        <EditorInstanceContextRefPlugin contextRef={contextRef} />
        {onChange && (
          <OnChangeExtensionPropsBridge
            ignoreSelectionChange={ignoreSelectionChange}
            onChange={onChange}
          />
        )}
        <ReloadPlugin
          instanceType={props.instanceType}
          editable={globalEditable}
          historyId={props.historyId}
          initialState={props.initialState}
          reloadKey={props.reloadKey}
          resumeLastSelection={resumeLastSelection}
          initialSelection={props.initialSelection}
          enableHistory={enableHistory}
        />
        <ZoomExtensionPropsBridge
          initialZoom={props.initialZoom}
          onZoomChange={props.onZoomChange}
        />
        <SearchPlugin
          searchText={searchText}
          historyId={props.historyId}
          reloadKey={props.reloadKey}
        />
        {children}
      </LexicalExtensionComposer>
    </EditorInstanceContextProvider>
  );
};

export default RichTextEditor;
