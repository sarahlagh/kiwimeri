import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  InitialEditorStateType,
  LexicalComposer
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { useLingui } from '@lingui/react/macro';
import React, { useState } from 'react';
import documentsService, { initialContent } from '../../db/documents.service';
import platformService from '../services/platform.service';
import { unminimizeFromStorage } from './compress-storage';
import DebugTreeViewPlugin from './lexical/DebugTreeViewPlugin';
import KiwimeriToolbarPlugin from './lexical/KiwimeriToolbarPlugin';
import KiwimeriEditorTheme from './lexical/theme/KiwimeriEditorTheme';

interface WriterProps {
  id: string;
  content: string;
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onError(error: any) {
  console.error(error);
}

const Writer = (
  { id, content }: WriterProps,
  ref: React.LegacyRef<HTMLDivElement> | undefined
) => {
  const { t } = useLingui();
  const placeholder = t`Text...`;
  const [hasUserChanges, setHasUserChanges] = useState(false);

  function createInitialState(): InitialEditorStateType {
    return content
      ? content.startsWith('{"root":{')
        ? content
        : unminimizeFromStorage(content)
      : initialContent();
  }

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
        editorState: createInitialState()
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
      <OnChangePlugin
        ignoreSelectionChange
        onChange={editorState => {
          const changes = JSON.stringify(editorState.toJSON());
          if (hasUserChanges) {
            documentsService.setDocumentContent(id, changes);
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

      {platformService.isDev() && <DebugTreeViewPlugin />}
    </LexicalComposer>
  );
};
export default React.forwardRef(Writer);
