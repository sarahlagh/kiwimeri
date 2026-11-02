import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import { Key, RefObject, useImperativeHandle, useMemo, useRef } from 'react';
import { AppExtensionConfig, buildAppExtension } from './app-extension';
import { EditorContextProvider, ReadOnlyEditorContext } from './EditorContext';
import { SearchExtension } from './extensions/SearchExtension';
import EditorContextRefPlugin from './react-plugins/EditorContextRefPlugin';
import OnChangePlugin, {
  OnChangePluginPayload
} from './react-plugins/OnChangePlugin';
import ReloadPlugin from './react-plugins/ReloadPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { RichTextEditorInitialData } from './types';

export type RichTextEditorProps = RichTextEditorInitialData &
  AppExtensionConfig & {
    searchText?: string;
    enableToolbar?: boolean;
    enableDebugTree?: boolean;
    ignoreSelectionChange?: boolean;
    additionalClassNames?: string;
    onChange?: (payload: OnChangePluginPayload) => void;
    reloadKey?: Key;
  };

const RichTextEditor = ({
  onChange,
  initialZoom,
  onZoomChange,
  initialState,
  serializedSelection,
  historyId,
  resumeLastSelection = false,
  ignoreSelectionChange = true,
  globalEditable = true,
  enableToolbar = true,
  enableHistory = true,
  enableDebugTree = false,
  searchText,
  additionalClassNames,
  ref,
  reloadKey
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

  const appExtension = useMemo(
    () =>
      buildAppExtension({
        historyId,
        enableHistory,
        initialZoom,
        onZoomChange
      }),
    [historyId, enableHistory, initialZoom, onZoomChange]
  );

  return (
    <EditorContextProvider globalEditable={globalEditable}>
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
        <EditorContextRefPlugin contextRef={contextRef} />
        <ReloadPlugin
          isReloadingRef={isReloadingRef}
          initialState={initialState}
          globalEditable={globalEditable}
          serializedSelection={serializedSelection}
          resumeLastSelection={resumeLastSelection}
          reloadKey={reloadKey}
          historyId={historyId}
        />
        <OnChangePlugin
          isReloadingRef={isReloadingRef}
          ignoreSelectionChange={ignoreSelectionChange}
          onChange={payload => {
            if (onChange) onChange(payload);
          }}
        />
        <ExtensionComponent
          lexical:extension={SearchExtension}
          searchText={searchText}
        />
      </LexicalExtensionComposer>
    </EditorContextProvider>
  );
};

export default RichTextEditor;
