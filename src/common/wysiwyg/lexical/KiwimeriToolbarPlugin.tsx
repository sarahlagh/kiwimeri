import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import HeaderButton from './toolbar/HeaderButton';
import InsertHorizontalRuleButton from './toolbar/InsertHorizontalRuleButton';

export default function KiwimeriToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  return (
    <>
      <HeaderButton editor={editor} tag={'h1'}></HeaderButton>
      <HeaderButton editor={editor} tag={'h2'}></HeaderButton>
      <HeaderButton editor={editor} tag={'h3'}></HeaderButton>
      <InsertHorizontalRuleButton editor={editor}></InsertHorizontalRuleButton>
    </>
  );
}
