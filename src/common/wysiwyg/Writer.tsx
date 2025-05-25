import { PagePreview } from '@/collection/collection';
import platformService from '@/common/services/platform.service';
import collectionService from '@/db/collection.service';
import { CodeNode } from '@lexical/code';
import { $generateHtmlFromNodes } from '@lexical/html';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
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
import React, { useEffect, useState } from 'react';
import { minimizeContentForStorage } from './compress-file-content';
import DebugTreeViewPlugin from './lexical/DebugTreeViewPlugin';
import KiwimeriReloadContentPlugin from './lexical/KiwimeriReloadContentPlugin';
import KiwimeriToolbarPlugin from './lexical/KiwimeriToolbarPlugin';
import KiwimeriEditorTheme from './lexical/theme/KiwimeriEditorTheme';
import KiwimeriPagesBrowserPlugin from './pages/KiwimeriPagesBrowserPlugin';
import TogglePagesBrowserButton from './pages/TogglePagesBrowserButton';

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
  const placeholder = t`Text...`;
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [showPageBrowser, setShowPageBrowser] = useState(true);
  const hasPages = pages?.length || 0 > 0;

  useEffect(() => {
    setHasUserChanges(false);
  }, [id]);

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
      <KiwimeriToolbarPlugin document={id} />
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
        onChange={(editorState, editor) => {
          if (hasUserChanges) {
            const changes = JSON.stringify(editorState.toJSON());
            const minimized = minimizeContentForStorage(changes);
            editorState.read(() => {
              collectionService.setItemContent(
                id,
                minimized,
                $generateHtmlFromNodes(editor)
              );
            });
          }
          if (!hasUserChanges) {
            setHasUserChanges(true);
          }
        }}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin />
      <HorizontalRulePlugin />
      <TabIndentationPlugin />
      <SelectionAlwaysOnDisplay />
      <MarkdownShortcutPlugin />

      {hasPages && showPageBrowser && (
        <KiwimeriPagesBrowserPlugin
          docId={docId}
          docPreview={preview}
          id={id}
          pages={pages}
        />
      )}
      {hasPages && (
        <TogglePagesBrowserButton
          onClick={() => setShowPageBrowser(!showPageBrowser)}
        />
      )}

      {platformService.isDev() && <DebugTreeViewPlugin />}
    </LexicalComposer>
  );
};
export default React.forwardRef(Writer);
