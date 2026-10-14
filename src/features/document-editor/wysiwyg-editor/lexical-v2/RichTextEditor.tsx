import { appConfig } from '@/config';
import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import {
  createContext,
  RefObject,
  use,
  useImperativeHandle,
  useRef
} from 'react';
import { appExtension } from './app-extension';
import ReloadEditorPlugin from './legacy-plugins/ReloadEditorPlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';
import { ToolbarContextProvider } from './toolbar/ToolbarContext';
import { CustomInitialEditorStateType } from './types';

export type RichTextEditorProps = {
  initialState?: CustomInitialEditorStateType;
  editable?: boolean;
  enableToolbar?: boolean;
  enableDebugTree?: boolean;
};

type EditorContextSpec = {
  globalEditable: boolean;
};

const EditorContext = createContext<EditorContextSpec | undefined>(undefined);
export const useEditorContext = () => {
  const context = use(EditorContext);
  if (!context)
    throw new Error('useEditorContext must be used within the RichTextEditor');
  return context;
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
  const placeholder = t`Text...`;

  useImperativeHandle(
    ref,
    () => ({
      getEditor() {
        return editorRef.current;
      }
    }),
    [editorRef]
  );

  return (
    <EditorContext
      value={{
        globalEditable: editable
      }}
    >
      <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
        <ToolbarContextProvider>
          <div className="editor-container">
            {enableToolbar && <Toolbar />}
            <div className="editor-inner">
              <ContentEditable
                className="editor-input"
                aria-label={t`Rich text editor"`}
                aria-placeholder={placeholder}
                placeholder={
                  <div className="editor-placeholder">{placeholder}</div>
                }
              />
              {appConfig.DEV_ENABLE_LEXICAL_DEBUG_TREE && enableDebugTree && (
                <ExtensionComponent lexical:extension={TreeViewExtension} />
              )}
            </div>
          </div>
          <EditorRefPlugin editorRef={editorRef} />
          <ReloadEditorPlugin
            initialState={initialState}
            globalEditable={editable}
          />
        </ToolbarContextProvider>
      </LexicalExtensionComposer>
    </EditorContext>
  );
};

export default RichTextEditor;
