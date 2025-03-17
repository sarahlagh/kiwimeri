import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { MarkNode } from '@lexical/mark';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { serialize } from './conversion';
import KiwimeriToolbarPlugin from './lexical/KiwimeriToolbarPlugin';
import ParseInitialStatePlugin from './lexical/ParseInitialStatePlugin';

interface WriterProps {
  content: string;
  onContentChange: (content: string) => void;
}

const theme = {
  // Theme styling goes here
  //...
};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onError(error: any) {
  console.error(error);
}
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const Writer = ({ content, onContentChange }: WriterProps) => {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'writer',
        theme,
        onError,
        nodes: [
          MarkNode,
          HeadingNode,
          QuoteNode,
          LinkNode,
          ListNode,
          ListItemNode
        ],
        editorState: EMPTY_CONTENT
      }}
    >
      <KiwimeriToolbarPlugin />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-placeholder={'Enter some text...'}
            placeholder={<div></div>}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ParseInitialStatePlugin content={content} />
      <OnChangePlugin
        onChange={editorState => {
          onContentChange(serialize(editorState.toJSON()));
        }}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
};
export default Writer;
