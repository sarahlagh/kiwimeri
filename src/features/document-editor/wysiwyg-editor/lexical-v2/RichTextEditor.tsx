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
import ReloadEditorPlugin from './react-plugins/ReloadEditorPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { CustomInitialEditorStateType } from './types';

export type RichTextEditorProps = {
  initialState?: CustomInitialEditorStateType;
  editable?: boolean;
  enableToolbar?: boolean;
  enableDebugTree?: boolean;
};

const RichTextEditor = ({
  initialState,
  editable = true,
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
    <EditorContextProvider globalEditable={editable}>
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
        <ReloadEditorPlugin
          initialState={initialState}
          globalEditable={editable}
        />
      </LexicalExtensionComposer>
    </EditorContextProvider>
  );
};

export default RichTextEditor;
