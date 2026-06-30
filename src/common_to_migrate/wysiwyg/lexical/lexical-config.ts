import { CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { InitialConfigType } from '@lexical/react/LexicalComposer';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import KiwimeriEditorTheme from './theme/KiwimeriEditorTheme';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onError(error: any) {
  console.error(error);
}

export const lexicalConfig: InitialConfigType = {
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
    AutoLinkNode,
    ListNode,
    ListItemNode,
    HorizontalRuleNode
  ]
};
