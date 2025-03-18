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
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import ParseInitialStatePlugin from './lexical/ParseInitialStatePlugin';

import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { useLingui } from '@lingui/react/macro';
import React from 'react';
import platformService from '../services/platform.service';
import DebugTreeViewPlugin from './lexical/DebugTreeViewPlugin';
import KiwimeriToolbarPlugin from './lexical/KiwimeriToolbarPlugin';
import KiwimeriEditorTheme from './lexical/theme/KiwimeriEditorTheme';

interface WriterProps {
  content: string;
  onContentChange: (content: string) => void;
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onError(error: any) {
  console.error(error);
}
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const Writer = (
  { content, onContentChange }: WriterProps,
  ref: React.LegacyRef<HTMLDivElement> | undefined
) => {
  const { t } = useLingui();
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
          QuoteNode,
          LinkNode,
          ListNode,
          ListItemNode,
          HorizontalRuleNode
        ],
        editorState: EMPTY_CONTENT
      }}
    >
      <KiwimeriToolbarPlugin />
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
      <ParseInitialStatePlugin content={content} />
      <OnChangePlugin
        onChange={editorState => {
          onContentChange(JSON.stringify(editorState.toJSON()));
        }}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
      <ListPlugin />
      <HorizontalRulePlugin />

      {platformService.isDev() && <DebugTreeViewPlugin />}
    </LexicalComposer>
  );
};
export default React.forwardRef(Writer);
