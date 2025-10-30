import platformService from '@/common/services/platform.service';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { useLingui } from '@lingui/react/macro';
import { EditorState } from 'lexical';
import React, { ReactNode, useState } from 'react';
import { DebounceOnChangePlugin } from './DebounceOnChangePlugin';
import EditLinkPlugin from './EditLinkPlugin';
import KiwimeriToolbarPlugin, {
  ToolbarPluginProps
} from './KiwimeriToolbarPlugin';
import { lexicalConfig } from './lexical-config';
import AutoLinkPlugin from './playground/plugins/AutoLinkPlugin';
import DebugTreeViewPlugin from './playground/plugins/DebugTreeViewPlugin';
import { validateUrl } from './playground/utils/url';
import ReloadContentPlugin from './ReloadContentPlugin';

type KiwimeriEditorProps = {
  initId?: string;
  content: string;
  onChange: (editorState: EditorState) => void;
  debounce?: number;
} & Omit<ToolbarPluginProps, 'setIsLinkEditMode'> & {
    readonly children?: ReactNode;
  };

const KiwimeriEditor = (
  props: KiwimeriEditorProps,
  ref: React.LegacyRef<HTMLDivElement> | undefined
) => {
  const { t } = useLingui();
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  const { children, initId, content, onChange, debounce = 0 } = props;
  const placeholder = t`Text...`;

  return (
    <LexicalComposer
      initialConfig={{
        ...lexicalConfig
      }}
    >
      <KiwimeriToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} {...props} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            ref={ref}
            className="editor-input"
            aria-placeholder={placeholder}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ReloadContentPlugin id={initId || 'id'} content={content} />
      <DebounceOnChangePlugin
        ignoreSelectionChange
        waitFor={debounce}
        onChange={(editorState, editor, tags) => {
          if (tags.has('focus') || tags.has('reload')) {
            console.debug('skipping editor change', tags);
          } else {
            onChange(editorState);
          }
        }}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={validateUrl} />
      <AutoLinkPlugin />
      <HorizontalRulePlugin />
      <TabIndentationPlugin />
      <SelectionAlwaysOnDisplay />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

      <EditLinkPlugin
        isLinkEditMode={isLinkEditMode}
        setIsLinkEditMode={setIsLinkEditMode}
      />

      {children}

      {platformService.isDev() && <DebugTreeViewPlugin />}
    </LexicalComposer>
  );
};
export default React.forwardRef(KiwimeriEditor);
