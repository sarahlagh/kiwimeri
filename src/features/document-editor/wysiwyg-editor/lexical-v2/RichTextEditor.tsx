import { ExtensionComponent } from '@lexical/react/ExtensionComponent';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { TreeViewExtension } from '@lexical/react/TreeViewExtension';
import { useLingui } from '@lingui/react/macro';
import { LexicalEditor } from 'lexical';
import { RefObject, useImperativeHandle, useMemo, useRef } from 'react';
import { AppExtensionConfig, buildAppExtension } from './app-extension';
import { SearchExtension } from './extensions/SearchExtension';
import OnChangePlugin, {
  OnChangePluginPayload
} from './react-plugins/OnChangePlugin';
import { RichTextEditorHandle } from './RichTextEditorHandle';
import Toolbar from './toolbar/Toolbar';

export type RichTextEditorProps = AppExtensionConfig & {
  searchText?: string;
  enableToolbar?: boolean;
  enableDebugTree?: boolean;
  ignoreSelectionChange?: boolean;
  additionalClassNames?: string;
  onChange?: (payload: OnChangePluginPayload) => void;
};

const RichTextEditor = (
  props: RichTextEditorProps & {
    ref?: RefObject<RichTextEditorHandle | null>;
  }
) => {
  const { t } = useLingui();
  const editorRef = useRef<LexicalEditor | null>(null);
  const placeholder = t`Text...`;

  const {
    onChange,
    ignoreSelectionChange = true,
    enableToolbar = true,
    enableDebugTree = false,
    searchText,
    additionalClassNames,
    ref
  } = props;

  useImperativeHandle(
    ref,
    () => ({
      getEditor() {
        return editorRef.current;
      },
      focusEditor() {
        // note: this resumes the selection on small screens, but also triggers keyboard on small screen + android
        // this is annoying, but no known workarounds at this time
        // this will not be called on wide screens so not an issue there
        editorRef.current?.focus();
      }
    }),
    [editorRef]
  );

  const appExtension = useMemo(() => buildAppExtension(props), [props]);

  return (
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
      <OnChangePlugin
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
  );
};

export default RichTextEditor;
