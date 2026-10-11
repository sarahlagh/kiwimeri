import { appConfig } from '@/config';
import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { appExtension } from './app-extension';
import ReloadEditorStatePlugin from './legacy-plugins/ReloadEditorStatePlugin';
import Toolbar from './toolbar/Toolbar';
import { ToolbarContextProvider } from './toolbar/ToolbarContext';
import { CustomInitialEditorStateType } from './types';

type RichTextEditorProps = {
  initialState?: CustomInitialEditorStateType;
  editable?: boolean;
  enableDebugTree?: boolean;
};

const RichTextEditor = ({
  initialState,
  editable = true,
  enableDebugTree = false
}: RichTextEditorProps) => {
  const { t } = useLingui();
  const [isComposerEditable, setIsComposerEditable] = useState(editable);
  const placeholder = t`Text...`;
  return (
    <LexicalExtensionComposer extension={appExtension} contentEditable={null}>
      <ToolbarContextProvider>
        <div className="editor-container">
          <Toolbar
            isEditableStateUpdatable={editable}
            setIsComposerEditable={setIsComposerEditable}
          />
          <div className="editor-inner">
            <ContentEditable
              contentEditable={isComposerEditable}
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
        <ReloadEditorStatePlugin initialState={initialState} />
      </ToolbarContextProvider>
    </LexicalExtensionComposer>
  );
};

export default RichTextEditor;
