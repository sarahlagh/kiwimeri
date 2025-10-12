import { PagePreview } from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import collectionService from '@/db/collection.service';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { TRANSFORMERS } from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import DebugTreeViewPlugin from './lexical/DebugTreeViewPlugin';
import KiwimeriReloadContentPlugin from './lexical/KiwimeriReloadContentPlugin';
import KiwimeriToolbarPlugin from './lexical/KiwimeriToolbarPlugin';
import KiwimeriEditorTheme from './lexical/theme/KiwimeriEditorTheme';
import KiwimeriPagesBrowserPlugin from './pages/KiwimeriPagesBrowserPlugin';

interface WriterProps {
  docId: string;
  id: string;
  content: string;
  preview: string;
  pages?: PagePreview[];
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onError(error: any) {
  console.error(error);
}

const Writer = (
  { docId, id, content, preview, pages }: WriterProps,
  ref: React.LegacyRef<HTMLDivElement> | undefined
) => {
  const { t } = useLingui();
  const [showPageBrowser, setShowPageBrowser] = useState(false);

  const placeholder = t`Text...`;

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'writer',
        theme: KiwimeriEditorTheme,
        onError,
        // https://github.com/facebook/lexical/discussions/3638
        nodes: [
          MarkNode,
          HeadingNode,
          CodeNode,
          QuoteNode,
          LinkNode,
          ListNode,
          ListItemNode,
          HorizontalRuleNode
        ]
      }}
    >
      <KiwimeriToolbarPlugin
        pageBrowserHighlighted={(pages?.length || 0) > 0}
        pageBrowserOn={showPageBrowser}
        onTogglePageBrowser={onOff => {
          setShowPageBrowser(onOff);
        }}
      />
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
      <KiwimeriReloadContentPlugin id={id} content={content} />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState, editor, tags) => {
          if (tags.has('focus') || tags.has('reload')) {
            console.debug('skipping editor change', tags);
          } else {
            collectionService.setItemLexicalContent(id, editorState.toJSON());
          }
        }}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin />
      <HorizontalRulePlugin />
      <TabIndentationPlugin />
      <SelectionAlwaysOnDisplay />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

      {showPageBrowser && (
        <KiwimeriPagesBrowserPlugin
          docId={docId}
          docPreview={preview}
          id={id}
          pages={pages}
        />
      )}

      {platformService.isDev() && <DebugTreeViewPlugin />}
    </LexicalComposer>
  );
};
export default React.forwardRef(Writer);
